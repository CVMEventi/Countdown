import {
  DEFAULT_QLAB_CONFIG,
  PlaybackProviderConfig,
  PlaybackProviderStatus,
  PlaybackState,
  QLAB_PROVIDER_ID,
  QLabProviderConfig,
} from "@common/playback.ts";
import type {PlaybackProvider, PlaybackProviderContext} from "../../PlaybackProvider.ts";
import {oscSocketPool, OscMessage, OscSocketPool, OscSubscription} from "../../osc/OscSocketPool.ts";
import {
  buildPlaybackState,
  candidateCues,
  cueIdFromAddress,
  flattenCues,
  parseCueValues,
  parseQLabReply,
  QLAB_VALUE_KEYS,
  QLabCue,
  QLabCueValues,
  workspaceAddress,
} from "./qlabOsc.ts";

/**
 * Mirrors the cue QLab is playing, over its OSC dictionary.
 *
 * Read only, and request/response rather than push: QLab answers questions, so each poll asks what
 * is running and then asks that cue for its times. Queries go out through the same socket the
 * replies arrive on, which covers both of QLab's reply behaviours — answering the sender's port,
 * and answering a fixed 53001 — as long as we ask from the port we listen on.
 */
export class QLabProvider implements PlaybackProvider {
  readonly id = QLAB_PROVIDER_ID

  private _context: PlaybackProviderContext
  private _pool: OscSocketPool
  private _config: QLabProviderConfig = {...DEFAULT_QLAB_CONFIG}
  private _configKey: string | null = null
  private _subscription: OscSubscription = null
  private _poll: NodeJS.Timeout = null
  private _running = false
  private _listening = false
  private _lastError: string | null = null
  private _activeTitle: string | null = null
  private _label = 'QLab'

  // What the last round of replies told us
  private _cues: QLabCue[] = []
  private _values = new Map<string, QLabCueValues>()
  private _lastReplyAt = 0
  private _lastLoggedState: string | null = null
  private _replyCount = 0

  constructor(context: PlaybackProviderContext, pool: OscSocketPool = oscSocketPool) {
    this._context = context
    this._pool = pool
  }

  applyConfig(config: PlaybackProviderConfig) {
    const next = {...DEFAULT_QLAB_CONFIG, ...config} as QLabProviderConfig
    const key = [next.host, next.port, next.replyPort, next.workspace, next.passcode, next.cue, next.pollInterval].join('|')

    this._config = next
    this._label = next.cue ? `QLab/${next.cue}` : 'QLab'

    if (!next.enabled) {
      if (this._running) {
        this._log('disabled, releasing the timers')
        this.stop()
      }
      this._context.onStatus()
      return
    }

    // Edge triggered: an unrelated settings save must not drop a bound socket
    if (this._running && key === this._configKey) return
    if (this._running) this.stop()

    this._configKey = key
    this._running = true
    this._lastError = null
    this._start()
    this._context.onStatus()
  }

  stop() {
    if (this._poll) {
      clearInterval(this._poll)
      this._poll = null
    }
    this._subscription?.release()
    this._subscription = null
    this._cues = []
    this._values.clear()
    this._running = false
    this._listening = false
    this._activeTitle = null
    this._configKey = null
    this._lastReplyAt = 0
    this._replyCount = 0
    this._lastLoggedState = null
  }

  status(): PlaybackProviderStatus {
    return {
      id: this.id,
      enabled: this._config.enabled,
      connected: this._listening && this._replyCount > 0 && !this._isSilent(),
      lastError: this._lastError,
      activeTitle: this._activeTitle,
    }
  }

  private _log(message: string, ...rest: unknown[]) {
    console.log(`[${this._label}] ${message}`, ...rest)
  }

  private _replyTimeout() {
    return Math.max(1000, this._pollInterval() * 4)
  }

  private _pollInterval() {
    return Math.max(100, Number(this._config.pollInterval) || DEFAULT_QLAB_CONFIG.pollInterval)
  }

  private _isSilent() {
    return this._context.now() - this._lastReplyAt > this._replyTimeout()
  }

  private _start() {
    const replyPort = Number(this._config.replyPort)
    const subscription = this._pool.subscribe(replyPort)
    this._subscription = subscription

    subscription.onListening(() => {
      this._listening = true
      this._log(`asking ${this._config.host}:${this._config.port} from local port ${replyPort}`)
      this._context.onStatus()
    })

    subscription.onMessage((message) => this._receive(message))

    subscription.onError((error) => {
      this._listening = false
      this._lastError = error instanceof Error ? error.message : String(error)
      this._log(`socket error: ${this._lastError}`)
      this._context.onStatus()
    })

    this._poll = setInterval(this._tick.bind(this), this._pollInterval())
    this._tick()
  }

  private _send(address: string, ...args: unknown[]) {
    this._subscription?.send(
      [workspaceAddress(address, this._config.workspace), ...args] as OscMessage,
      Number(this._config.port),
      this._config.host,
    )
  }

  private _tick() {
    if (!this._running) return

    // A workspace with a passcode ignores everything until it is unlocked, and re-sending is
    // harmless, so this rides along with the poll rather than needing connection state
    if (this._config.passcode) this._send('/connect', this._config.passcode)

    this._send('/runningOrPausedCues')

    // Ask the cues we already know about for their times. The list and the times are therefore one
    // poll apart, which at this rate is invisible and keeps each round to a fixed size.
    candidateCues(this._cues, this._config.cue)
      .slice(0, 8)
      .forEach(cue => this._send(`/cue_id/${cue.uniqueID}/valuesForKeys`, JSON.stringify(QLAB_VALUE_KEYS)))

    this._publish()
  }

  private _receive(message: OscMessage) {
    const reply = parseQLabReply(message)
    if (!reply) return

    this._lastReplyAt = this._context.now()
    this._replyCount += 1

    if (this._replyCount === 1) this._log('first reply received')

    if (reply.status !== 'ok') {
      // A locked workspace answers "denied" to everything until /connect succeeds
      this._lastError = reply.status === 'denied'
        ? 'Denied by QLab — check the workspace passcode'
        : `QLab replied "${reply.status}"`
      this._context.onStatus()
      return
    }

    if (this._lastError) {
      this._lastError = null
      this._context.onStatus()
    }

    if (reply.address.endsWith('/runningOrPausedCues')) {
      const cues = flattenCues(reply.data)
      const known = new Set(cues.map(cue => cue.uniqueID))
      // Forget the times of cues that stopped, so a finished cue cannot linger
      Array.from(this._values.keys()).forEach(id => { if (!known.has(id)) this._values.delete(id) })
      this._cues = cues
      return
    }

    if (reply.address.includes('/valuesForKeys')) {
      const cueId = cueIdFromAddress(reply.address)
      const values = parseCueValues(reply.data)
      if (!cueId || !values) return
      this._values.set(cueId, values)
    }
  }

  private _publish() {
    if (!this._running) return

    const state = this._isSilent() ? null : this._select()

    this._logState(state)

    const title = state?.title ?? null
    if (title !== this._activeTitle) {
      this._activeTitle = title
      this._context.onStatus()
    }

    this._context.onState(state)
  }

  private _select(): PlaybackState | null {
    for (const cue of candidateCues(this._cues, this._config.cue)) {
      const values = this._values.get(cue.uniqueID)
      if (!values) continue

      const state = buildPlaybackState(cue, values)
      if (state) return state
    }

    return null
  }

  // Only transitions, so the console shows takeovers and releases rather than a stream
  private _logState(state: PlaybackState | null) {
    const key = state ? `${state.clipId}|${state.isRunning}` : 'none'
    if (key === this._lastLoggedState) return
    this._lastLoggedState = key

    if (state) {
      this._log(`driving timers from "${state.title ?? 'untitled'}" — ${state.remainingSeconds}s left of ${state.totalSeconds}s, ${state.isRunning ? 'running' : 'paused'}`)
      return
    }

    if (this._replyCount === 0) {
      this._log(`nothing to mirror: QLab has not replied yet (is "OSC replies" on, and is ${this._config.host} reachable?)`)
      return
    }

    if (this._isSilent()) {
      this._log('nothing to mirror: QLab stopped replying')
      return
    }

    if (this._cues.length === 0) {
      this._log('nothing to mirror: no cue is running')
      return
    }

    this._log('nothing to mirror: no running cue qualifies', this._cues.map(cue => ({
      number: cue.number,
      name: cue.name,
      type: cue.type,
      ...(this._values.get(cue.uniqueID) ?? {}),
    })))
  }
}
