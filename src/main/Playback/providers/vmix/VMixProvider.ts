import {
  DEFAULT_VMIX_CONFIG,
  PlaybackProviderConfig,
  PlaybackProviderStatus,
  VMIX_PROVIDER_ID,
  VMixProviderConfig,
} from "@common/playback.ts";
import type {PlaybackProvider, PlaybackProviderContext} from "../../PlaybackProvider.ts";
import {parseVmixApi, selectPlaybackState} from "./vmixApi.ts";

/**
 * Mirrors whichever input vMix has on Program, over the vMix Web API.
 *
 * Read only: nothing is ever sent to vMix. De-duplication and staleness are deliberately absent —
 * PlaybackManager owns those for every provider.
 */
export class VMixProvider implements PlaybackProvider {
  readonly id = VMIX_PROVIDER_ID

  private _context: PlaybackProviderContext
  private _fetchFn: typeof fetch
  private _config: VMixProviderConfig = {...DEFAULT_VMIX_CONFIG}
  private _configKey: string | null = null
  private _timer: NodeJS.Timeout = null
  private _abort: AbortController = null
  private _running = false
  private _connected = false
  private _lastError: string | null = null
  private _activeTitle: string | null = null

  constructor(context: PlaybackProviderContext, fetchFn: typeof fetch = (input, init) => fetch(input, init)) {
    this._context = context
    this._fetchFn = fetchFn
  }

  applyConfig(config: PlaybackProviderConfig) {
    const next = {...DEFAULT_VMIX_CONFIG, ...config} as VMixProviderConfig
    const key = this._keyOf(next)

    this._config = next

    if (!next.enabled) {
      if (this._running) this.stop()
      this._context.onStatus()
      return
    }

    // Edge triggered: an unrelated settings save must not restart a healthy poller
    if (this._running && key === this._configKey) return
    if (this._running) this.stop()

    this._configKey = key
    this._running = true
    this._lastError = null
    this._context.onStatus()
    this._poll()
  }

  stop() {
    if (this._timer) {
      clearTimeout(this._timer)
      this._timer = null
    }
    this._abort?.abort()
    this._abort = null
    this._running = false
    this._connected = false
    this._activeTitle = null
    this._configKey = null
  }

  status(): PlaybackProviderStatus {
    return {
      id: this.id,
      enabled: this._config.enabled,
      connected: this._connected,
      lastError: this._lastError,
      activeTitle: this._activeTitle,
    }
  }

  private _keyOf(config: VMixProviderConfig) {
    return [config.host, config.port, config.username, config.password, config.pollInterval, config.followLooping].join('|')
  }

  private _pollInterval() {
    return Math.max(50, Number(this._config.pollInterval) || DEFAULT_VMIX_CONFIG.pollInterval)
  }

  // Chained rather than setInterval so a slow vMix can never stack requests
  private _schedule() {
    if (!this._running) return
    this._timer = setTimeout(this._poll.bind(this), this._pollInterval())
  }

  private async _poll() {
    this._timer = null
    if (!this._running) return

    const previous = {connected: this._connected, lastError: this._lastError, title: this._activeTitle}

    try {
      const state = await this._fetchState()
      const playback = selectPlaybackState(state, {followLooping: this._config.followLooping, input: this._config.input})

      this._connected = true
      this._lastError = null
      this._activeTitle = playback?.title ?? null
      this._context.onState(playback)
    } catch (error) {
      this._connected = false
      this._lastError = this._describe(error)
      this._activeTitle = null
      // No onState(null) here: the manager expires the last state once it goes stale, so a single
      // dropped poll does not flicker the display back to the manual timer
    }

    if (previous.connected !== this._connected
      || previous.lastError !== this._lastError
      || previous.title !== this._activeTitle) {
      this._context.onStatus()
    }

    this._schedule()
  }

  private async _fetchState() {
    const controller = new AbortController()
    this._abort = controller
    const timeout = setTimeout(() => controller.abort(), this._pollInterval() * 4)

    try {
      const response = await this._fetchFn(
        `http://${this._config.host}:${this._config.port}/api`,
        {headers: this._headers(), signal: controller.signal},
      )

      if (response.status === 401 || response.status === 403) throw new Error('Authentication failed')
      if (!response.ok) throw new Error(`vMix responded ${response.status}`)

      return parseVmixApi(await response.text())
    } finally {
      clearTimeout(timeout)
      if (this._abort === controller) this._abort = null
    }
  }

  private _headers(): Record<string, string> {
    // vMix 23+ can put the Web API behind basic auth; without a username there is none to send
    if (!this._config.username && !this._config.password) return {}
    const credentials = Buffer.from(`${this._config.username}:${this._config.password}`).toString('base64')
    return {Authorization: `Basic ${credentials}`}
  }

  private _describe(error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') return 'vMix did not respond'
      return error.message
    }
    return String(error)
  }
}
