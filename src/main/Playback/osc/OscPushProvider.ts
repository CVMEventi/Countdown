import type {PlaybackProviderConfig, PlaybackProviderStatus, PlaybackState} from "@common/playback.ts";
import type {PlaybackProvider, PlaybackProviderContext} from "../PlaybackProvider.ts";
import {OscMessage, OscSocketPool, OscSubscription} from "./OscSocketPool.ts";

const HEARTBEAT_INTERVAL = 250
// A repeating address is logged on a timer rather than per packet, so a stream stays readable
const REPEAT_LOG_INTERVAL = 2000

/**
 * The half of a push-over-OSC provider that is the same whoever is sending.
 *
 * Millumin and OSCPoint both announce what they are playing rather than answering questions, and
 * both therefore need the same things: a shared socket, bundles unpacked, a heartbeat that keeps a
 * paused item alive against the manager's staleness sweep, and diagnostics that say why nothing is
 * being mirrored. A subclass is left with its own protocol and nothing else.
 */
export abstract class OscPushProvider<C extends PlaybackProviderConfig> implements PlaybackProvider {
  abstract readonly id: string

  protected _context: PlaybackProviderContext
  protected _config: C
  private _pool: OscSocketPool
  private _configKey: string | null = null
  private _subscription: OscSubscription = null
  private _heartbeat: NodeJS.Timeout = null
  private _running = false
  private _listening = false
  private _lastError: string | null = null
  private _activeTitle: string | null = null

  // Diagnostics
  protected _packetCount = 0
  private _seenAddresses = new Set<string>()
  private _lastRepeatLogAt = 0
  private _lastLoggedState: string | null = null

  constructor(context: PlaybackProviderContext, pool: OscSocketPool, defaults: C) {
    this._context = context
    this._pool = pool
    this._config = {...defaults}
  }

  // ── What a subclass must provide ────────────────────────────────────────────

  /** Prefix for this source's log lines, e.g. "Millumin/Main". */
  protected abstract label(): string
  /** Everything that, when changed, means the socket has to be rebuilt. */
  protected abstract identity(config: C): string
  protected abstract listenPort(config: C): number
  protected abstract listeningHint(port: number): string
  protected abstract handleMessage(address: string, args: unknown[], now: number): void
  protected abstract computeState(now: number): PlaybackState | null
  /** Drops whatever the protocol has accumulated, so a restart starts clean. */
  protected abstract resetProtocol(): void
  /** What to print when there is nothing to mirror but packets are arriving. */
  protected abstract idleDetail(): unknown

  /** Optional: a note about what an address meant, shown the first time it is seen. */
  protected describeAddress(address: string): string | null {
    void address
    return null
  }

  /** Optional: true for an address that repeats constantly and should be log-throttled. */
  protected isRepeating(address: string): boolean {
    void address
    return false
  }

  /** Optional: log every packet rather than one line per distinct address. */
  protected verboseLogging(): boolean {
    return false
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  applyConfig(config: PlaybackProviderConfig) {
    const next = {...this.defaults(), ...config} as C
    const key = this.identity(next)

    this._config = next

    if (!config.enabled) {
      if (this._running) {
        this.log('disabled, releasing the timers')
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
    this.resetProtocol()
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

  protected abstract defaults(): C

  protected log(message: string, ...rest: unknown[]) {
    console.log(`[${this.label()}] ${message}`, ...rest)
  }

  private _start() {
    const port = this.listenPort(this._config)
    const subscription = this._pool.subscribe(port)
    this._subscription = subscription

    subscription.onListening(() => {
      this._listening = true
      this._lastError = null
      this.log(this.listeningHint(port))
      this._context.onStatus()
    })

    subscription.onMessage((message) => this._receive(message))

    // A sender may pack its feedback into bundles, which node-osc reports on its own event. A
    // listener that only takes 'message' would drop every one of them without a word.
    subscription.onBundle((bundle) => {
      flattenOscBundle(bundle).forEach(message => this._receive(message, true))
    })

    subscription.onError((error) => {
      // Most often the port is already taken, which the operator has to see to fix
      this._listening = false
      this._lastError = error instanceof Error ? error.message : String(error)
      this.log(`socket error: ${this._lastError}`)
      this._context.onStatus()
    })

    this._heartbeat = setInterval(this._publish.bind(this), HEARTBEAT_INTERVAL)
  }

  private _receive(message: OscMessage, fromBundle = false) {
    const [address, ...args] = message
    const now = this._context.now()

    this._packetCount += 1
    if (this._packetCount === 1) {
      this.log(`first OSC packet received${fromBundle ? ' (inside a bundle)' : ''}`)
    }

    this._logAddress(address, args, now, fromBundle)
    this.handleMessage(address, args, now)
  }

  private _logAddress(address: string, args: unknown[], now: number, fromBundle: boolean) {
    const suffix = fromBundle ? ' (bundled)' : ''

    if (this.verboseLogging()) {
      this.log(`<- ${address}${suffix}`, args)
      return
    }

    // Every distinct address once, so an unexpected shape shows up without flooding the console
    if (!this._seenAddresses.has(address)) {
      this._seenAddresses.add(address)
      const note = this.describeAddress(address)
      this.log(`<- ${address}${suffix}`, args, note ?? '')
      return
    }

    // …then the repeating ones on a slow timer, so the values stay visible
    if (this.isRepeating(address) && now - this._lastRepeatLogAt >= REPEAT_LOG_INTERVAL) {
      this._lastRepeatLogAt = now
      this.log(`<- ${address}${suffix}`, args)
    }
  }

  private _publish() {
    if (!this._running) return

    const state = this.computeState(this._context.now())
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
      this.log(`driving timers from "${state.title ?? 'untitled'}" — ${state.remainingSeconds}s left of ${state.totalSeconds}s, ${state.isRunning ? 'running' : 'paused'}`)
      return
    }

    if (this._packetCount === 0) {
      this.log('nothing to mirror: no OSC packets have arrived yet')
      return
    }

    const detail = this.idleDetail()
    if (detail === null || detail === undefined) {
      this.log(`nothing to mirror: nothing is playing (${this._packetCount} packets seen, addresses: ${Array.from(this._seenAddresses).join(', ') || 'none'})`)
      return
    }

    this.log('nothing to mirror', detail)
  }
}

/**
 * Flattens an OSC bundle into its messages.
 *
 * node-osc reports a bundle on its own event rather than as messages, and bundles can nest, so a
 * listener that only handles 'message' silently drops everything an app sends bundled.
 */
export function flattenOscBundle(bundle: unknown): OscMessage[] {
  const elements = (bundle as {elements?: unknown[]})?.elements
  if (!Array.isArray(elements)) return []

  const messages: OscMessage[] = []
  elements.forEach(element => {
    if (Array.isArray(element) && typeof element[0] === 'string') {
      messages.push(element as OscMessage)
      return
    }
    messages.push(...flattenOscBundle(element))
  })

  return messages
}
