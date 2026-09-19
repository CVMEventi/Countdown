import {
  DEFAULT_MILLUMIN_CONFIG,
  MILLUMIN_PROVIDER_ID,
  MilluminProviderConfig,
  PlaybackProviderConfig,
  PlaybackProviderStatus,
  PlaybackState,
} from "@common/playback.ts";
import type {PlaybackProvider, PlaybackProviderContext} from "../../PlaybackProvider.ts";
import {flattenOscBundle, MilluminTracker, parseMilluminAddress} from "./milluminOsc.ts";
import {oscSocketPool, OscMessage, OscSocketPool, OscSubscription} from "../../osc/OscSocketPool.ts";

const HEARTBEAT_INTERVAL = 250
// media/time arrives many times a second, so the log reports it on a timer instead of per packet
const TIME_LOG_INTERVAL = 2000

/**
 * Mirrors the layer Millumin is playing, over its OSC feedback.
 *
 * Read only, and push rather than poll: Millumin sends to us, so there is nothing to request. The
 * heartbeat republishes the current state so a paused clip is not expired by the manager, which
 * de-duplicates the repeats away.
 *
 * The socket comes from a pool, so several sources watching different layers of the same Millumin
 * share one listener rather than fighting over the port.
 */
export class MilluminProvider implements PlaybackProvider {
  readonly id = MILLUMIN_PROVIDER_ID

  private _context: PlaybackProviderContext
  private _pool: OscSocketPool
  private _config: MilluminProviderConfig = {...DEFAULT_MILLUMIN_CONFIG}
  private _configKey: string | null = null
  private _tracker = new MilluminTracker()
  private _subscription: OscSubscription = null
  private _heartbeat: NodeJS.Timeout = null
  private _running = false
  private _listening = false
  private _lastError: string | null = null
  private _activeTitle: string | null = null
  private _label = 'Millumin'

  // Diagnostics
  private _packetCount = 0
  private _seenAddresses = new Set<string>()
  private _lastTimeLogAt = 0
  private _lastLoggedState: string | null = null

  constructor(context: PlaybackProviderContext, pool: OscSocketPool = oscSocketPool) {
    this._context = context
    this._pool = pool
  }

  applyConfig(config: PlaybackProviderConfig) {
    const next = {...DEFAULT_MILLUMIN_CONFIG, ...config} as MilluminProviderConfig
    const key = [next.port, next.layer, next.playingTimeout, next.logMessages].join('|')

    this._config = next
    this._label = next.layer ? `Millumin/${next.layer}` : 'Millumin'

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
    if (this._heartbeat) {
      clearInterval(this._heartbeat)
      this._heartbeat = null
    }
    this._subscription?.release()
    this._subscription = null
    this._tracker.clear()
    this._running = false
    this._listening = false
    this._activeTitle = null
    this._configKey = null
    this._packetCount = 0
    this._seenAddresses.clear()
    this._lastLoggedState = null
  }

  status(): PlaybackProviderStatus {
    return {
      id: this.id,
      enabled: this._config.enabled,
      connected: this._listening,
      lastError: this._lastError,
      activeTitle: this._activeTitle,
    }
  }

  private _log(message: string, ...rest: unknown[]) {
    console.log(`[${this._label}] ${message}`, ...rest)
  }

  private _start() {
    const port = Number(this._config.port)
    const subscription = this._pool.subscribe(port)
    this._subscription = subscription

    subscription.onListening(() => {
      this._listening = true
      this._lastError = null
      this._log(`listening on 0.0.0.0:${port} — point Millumin's OSC feedback here (Device manager, OSC tab, "API feedback")`)
      this._context.onStatus()
    })

    subscription.onMessage((message) => this._receive(message))

    // Millumin may pack its feedback into bundles, which node-osc reports on its own event. A
    // listener that only takes 'message' would drop every one of them without a word.
    subscription.onBundle((bundle) => {
      flattenOscBundle(bundle).forEach(message => this._receive(message, true))
    })

    subscription.onError((error) => {
      // Most often the port is already taken, which the operator has to see to fix
      this._listening = false
      this._lastError = error instanceof Error ? error.message : String(error)
      this._log(`socket error: ${this._lastError}`)
      this._context.onStatus()
    })

    this._heartbeat = setInterval(this._publish.bind(this), HEARTBEAT_INTERVAL)
  }

  private _receive(message: OscMessage, fromBundle = false) {
    const [address, ...args] = message
    const now = this._context.now()

    this._packetCount += 1
    if (this._packetCount === 1) {
      this._log(`first OSC packet received${fromBundle ? ' (inside a bundle)' : ''}`)
    }

    this._logAddress(address, args, now, fromBundle)
    this._tracker.handleMessage(address, args, now)
  }

  private _logAddress(address: string, args: unknown[], now: number, fromBundle: boolean) {
    const suffix = fromBundle ? ' (bundled)' : ''

    if (this._config.logMessages) {
      this._log(`<- ${address}${suffix}`, args)
      return
    }

    // Every distinct address once, so an unexpected shape shows up without flooding the console
    if (!this._seenAddresses.has(address)) {
      this._seenAddresses.add(address)
      const parsed = parseMilluminAddress(address)
      this._log(`<- ${address}${suffix}`, args, parsed ? `(layer "${parsed.layer}", ${parsed.path})` : '(ignored: not a layer media address)')
      return
    }

    // …then the repeating time messages on a slow timer, so the values stay visible
    if (address.endsWith('/media/time') && now - this._lastTimeLogAt >= TIME_LOG_INTERVAL) {
      this._lastTimeLogAt = now
      this._log(`<- ${address}${suffix}`, args)
    }
  }

  private _publish() {
    if (!this._running) return

    const state = this._tracker.state(this._context.now(), {
      layer: this._config.layer,
      playingTimeoutMs: Number(this._config.playingTimeout) || DEFAULT_MILLUMIN_CONFIG.playingTimeout,
    })

    this._logState(state)

    const title = state?.title ?? null
    if (title !== this._activeTitle) {
      this._activeTitle = title
      this._context.onStatus()
    }

    this._context.onState(state)
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

    if (this._packetCount === 0) {
      this._log('nothing to mirror: no OSC packets have arrived yet')
      return
    }

    const layers = this._tracker.snapshot()
    if (layers.length === 0) {
      this._log(`nothing to mirror: no layer is playing (${this._packetCount} packets seen, addresses: ${Array.from(this._seenAddresses).join(', ') || 'none'})`)
      return
    }

    this._log('nothing to mirror: no layer qualifies', layers.map(layer => ({
      layer: layer.layer,
      name: layer.name,
      duration: layer.duration,
      elapsed: layer.elapsed,
      paused: layer.paused,
    })))
  }
}
