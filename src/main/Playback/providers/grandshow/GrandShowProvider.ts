import dgram from "node:dgram";
import {
  DEFAULT_GRANDSHOW_CONFIG,
  GRANDSHOW_PROVIDER_ID,
  GrandShowProviderConfig,
  PlaybackProviderConfig,
  PlaybackProviderStatus,
  PlaybackState,
} from "@common/playback.ts";
import type {PlaybackProvider, PlaybackProviderContext} from "../../PlaybackProvider.ts";
import {
  buildPlaybackState,
  candidateNodes,
  encodeQuery,
  GRANDSHOW_QUERIES,
  GrandShowNode,
  nodeTitle,
  parseGrandShowReply,
  parsePin,
} from "./grandshowApi.ts";

export interface UdpSocket {
  on(event: 'message', callback: (message: Buffer) => void): void
  on(event: 'error', callback: (error: Error) => void): void
  on(event: 'listening', callback: () => void): void
  bind(): void
  send(message: Buffer, port: number, host: string): void
  close(): void
}

export type UdpSocketFactory = () => UdpSocket

const defaultSocketFactory: UdpSocketFactory = () => dgram.createSocket('udp4') as unknown as UdpSocket

/**
 * Mirrors the node GrandShow EE is playing, over its central control protocol.
 *
 * Read only, and request/response: each poll asks for the playing and the paused nodes, both of
 * which come back with their times inline. GrandShow answers whichever port asked, so every source
 * binds its own ephemeral port and nothing can clash with another listener.
 */
export class GrandShowProvider implements PlaybackProvider {
  readonly id = GRANDSHOW_PROVIDER_ID

  private _context: PlaybackProviderContext
  private _socketFactory: UdpSocketFactory
  private _config: GrandShowProviderConfig = {...DEFAULT_GRANDSHOW_CONFIG}
  private _configKey: string | null = null
  private _socket: UdpSocket = null
  private _poll: NodeJS.Timeout = null
  private _running = false
  private _listening = false
  private _lastError: string | null = null
  private _activeTitle: string | null = null
  private _label = 'GrandShow'

  private _playing: GrandShowNode[] = []
  private _paused: GrandShowNode[] = []
  private _serviceRunning: boolean | null = null
  private _lastReplyAt = 0
  private _replyCount = 0
  private _lastLoggedState: string | null = null
  private _loggedErrors = new Set<string>()

  constructor(context: PlaybackProviderContext, socketFactory: UdpSocketFactory = defaultSocketFactory) {
    this._context = context
    this._socketFactory = socketFactory
  }

  applyConfig(config: PlaybackProviderConfig) {
    const next = {...DEFAULT_GRANDSHOW_CONFIG, ...config} as GrandShowProviderConfig
    const key = [next.host, next.port, next.node, next.pollInterval].join('|')

    this._config = next
    this._label = next.node.trim() ? `GrandShow/${next.node.trim()}` : 'GrandShow'

    if (!next.enabled) {
      if (this._running) {
        this._log('disabled, releasing the timers')
        this.stop()
      }
      this._context.onStatus()
      return
    }

    // Edge triggered: an unrelated settings save must not restart a healthy poller
    if (this._running && key === this._configKey) return
    if (this._running) this.stop()

    this._configKey = key
    this._running = true
    this._lastError = parsePin(next.node) || !next.node.trim()
      ? null
      : `"${next.node}" is not a node: use a row like 2, or a row and column like 1,3`
    this._start()
    this._context.onStatus()
  }

  stop() {
    if (this._poll) {
      clearInterval(this._poll)
      this._poll = null
    }
    try {
      this._socket?.close()
    } catch {
      // An unbound socket throws on close; nothing depends on it having succeeded
    }
    this._socket = null
    this._playing = []
    this._paused = []
    this._serviceRunning = null
    this._running = false
    this._listening = false
    this._activeTitle = null
    this._configKey = null
    this._lastReplyAt = 0
    this._replyCount = 0
    this._lastLoggedState = null
    this._loggedErrors.clear()
  }

  status(): PlaybackProviderStatus {
    return {
      id: this.id,
      enabled: this._config.enabled,
      connected: this._listening && this._replyCount > 0 && !this._isSilent() && this._serviceRunning !== false,
      lastError: this._lastError,
      activeTitle: this._activeTitle,
    }
  }

  private _log(message: string, ...rest: unknown[]) {
    console.log(`[${this._label}] ${message}`, ...rest)
  }

  private _pollInterval() {
    return Math.max(100, Number(this._config.pollInterval) || DEFAULT_GRANDSHOW_CONFIG.pollInterval)
  }

  private _replyTimeout() {
    return Math.max(1000, this._pollInterval() * 4)
  }

  private _isSilent() {
    return this._context.now() - this._lastReplyAt > this._replyTimeout()
  }

  private _start() {
    const socket = this._socketFactory()
    this._socket = socket

    socket.on('listening', () => {
      this._listening = true
      this._log(`asking ${this._config.host}:${this._config.port}`)
      this._context.onStatus()
      this._tick()
    })

    socket.on('message', (message) => this._receive(message))

    socket.on('error', (error) => {
      this._listening = false
      this._lastError = error instanceof Error ? error.message : String(error)
      this._log(`socket error: ${this._lastError}`)
      this._context.onStatus()
    })

    socket.bind()
    this._poll = setInterval(this._tick.bind(this), this._pollInterval())
  }

  private _send(query: object) {
    if (!this._listening) return
    try {
      this._socket?.send(encodeQuery(query), Number(this._config.port), this._config.host)
    } catch (error) {
      // A socket closing under a send in flight must not take the provider down with it
      console.error('GrandShow send failed', error)
    }
  }

  private _tick() {
    if (!this._running) return

    this._send(GRANDSHOW_QUERIES.playing)
    this._send(GRANDSHOW_QUERIES.paused)
    this._send(GRANDSHOW_QUERIES.service)

    this._publish()
  }

  private _receive(message: Buffer) {
    const reply = parseGrandShowReply(message)
    if (!reply) return

    this._lastReplyAt = this._context.now()
    this._replyCount += 1
    if (this._replyCount === 1) this._log('first reply received')

    switch (reply.kind) {
      case 'playing':
        this._playing = reply.nodes
        break
      case 'paused':
        this._paused = reply.nodes
        break
      case 'service':
        if (reply.running !== this._serviceRunning) {
          this._serviceRunning = reply.running
          this._setError(reply.running ? null : 'Central control is off in GrandShow — enable it under Settings → Software Settings')
        }
        return
      case 'error':
        // Older protocol versions lack some queries. Logged, not surfaced: the other queries still
        // answer, so a status error would flicker on and off every poll.
        if (!this._loggedErrors.has(reply.message)) {
          this._loggedErrors.add(reply.message)
          this._log(`GrandShow replied "${reply.message}"`)
        }
        return
    }

    if (this._serviceRunning !== false) this._setError(null)
  }

  private _setError(error: string | null) {
    if (error === this._lastError) return
    // A bad pin is a config problem; replies must not clear it
    if (error === null && this._config.node.trim() && !parsePin(this._config.node)) return
    this._lastError = error
    this._context.onStatus()
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
    const pinText = this._config.node.trim()
    const pin = parsePin(pinText)
    if (pinText && !pin) return null

    for (const {node, isRunning} of candidateNodes(this._playing, this._paused, pin)) {
      const state = buildPlaybackState(node, isRunning)
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
      this._log(`driving timers from ${state.title} — ${state.remainingSeconds}s left of ${state.totalSeconds}s, ${state.isRunning ? 'running' : 'paused'}`)
      return
    }

    if (this._replyCount === 0) {
      this._log(`nothing to mirror: GrandShow has not replied yet (is central control on, and is ${this._config.host} reachable?)`)
      return
    }

    if (this._isSilent()) {
      this._log('nothing to mirror: GrandShow stopped replying')
      return
    }

    if (this._playing.length === 0 && this._paused.length === 0) {
      this._log('nothing to mirror: no node is playing')
      return
    }

    this._log('nothing to mirror: no playing node qualifies', [...this._playing, ...this._paused].map(node => ({
      node: nodeTitle(node),
      curMs: node.curMs,
      endMs: node.endMs,
    })))
  }
}
