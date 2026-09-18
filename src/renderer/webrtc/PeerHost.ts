import {Peer} from 'peerjs'
import type {DataConnection} from 'peerjs'
import {
  MIN_SUPPORTED_PROTOCOL_VERSION,
  PROTOCOL_VERSION,
  isRtcFrame,
  roomCodeToPeerId,
} from '../../common/protocol.ts'
import type {HelloUpdate, RtcErrorCode, RtcRole} from '../../common/protocol.ts'
import type {IceServerConfig, SignalingConfig} from '../../common/config.ts'
import {APP_VERSION} from '../../version.ts'

const HEARTBEAT_MS = 5000
const HELLO_TIMEOUT_MS = 10000
const COMMAND_BUCKET_SIZE = 40
const COMMAND_REFILL_PER_SECOND = 20
// Above this the channel is not draining, so only last-write-wins frames get dropped
const BACKPRESSURE_BYTES = 256 * 1024

export interface PeerHostSession {
  sessionId: string
  controlKey: string
  viewKey: string
}

export interface PeerHostOptions {
  session: PeerHostSession
  signaling: SignalingConfig
  iceServers: IceServerConfig[]
  iceTransportPolicy: 'all' | 'relay'
  onStatus: (state: string, lastError: string | null) => void
  onClients: (clients: ClientReport[]) => void
  onCommand: (command: unknown) => Promise<{ok: boolean, error?: string}>
  getSnapshot: () => Promise<unknown>
  requireApproval: boolean
  onApprovalRequest: (clientId: string, name: string) => Promise<boolean>
}

export interface ClientReport {
  clientId: string
  name: string
  role: RtcRole
  since: number
  rttMs: number | null
}

interface Client {
  connection: DataConnection
  clientId: string
  name: string
  role: RtcRole
  since: number
  rttMs: number | null
  tokens: number
  lastRefill: number
  helloTimer: ReturnType<typeof setTimeout> | null
}

export class PeerHost {
  private _peer: Peer | null = null
  private _options: PeerHostOptions
  private _clients = new Map<DataConnection, Client>()
  private _blocked = new Set<string>()
  private _heartbeat: ReturnType<typeof setInterval> | null = null
  private _pending = new Map<string, unknown>()
  private _flushScheduled = false

  constructor(options: PeerHostOptions) {
    this._options = options
  }

  start() {
    this.stop()

    const {session, signaling, iceServers, iceTransportPolicy} = this._options
    const peerId = roomCodeToPeerId(session.sessionId)

    this._options.onStatus('signaling', null)

    this._peer = new Peer(peerId, {
      ...(signaling.host ? {
        host: signaling.host,
        port: signaling.port ?? (signaling.secure ? 443 : 80),
        path: signaling.path,
        secure: signaling.secure,
      } : {}),
      key: signaling.key || 'peerjs',
      config: {iceServers, iceTransportPolicy},
    })

    this._peer.on('open', () => this._options.onStatus('online', null))
    this._peer.on('connection', connection => this._accept(connection))
    this._peer.on('error', error => {
      // A broker outage must not tear down connections that are already established
      const fatal = ['unavailable-id', 'invalid-id', 'ssl-unavailable'].includes((error as {type?: string}).type ?? '')
      this._options.onStatus(fatal ? 'failed' : 'signaling', error.message)
    })
    this._peer.on('disconnected', () => this._options.onStatus('signaling', 'Signaling offline'))

    this._heartbeat = setInterval(() => this._ping(), HEARTBEAT_MS)
  }

  stop() {
    if (this._heartbeat) clearInterval(this._heartbeat)
    this._heartbeat = null
    this._clients.forEach(client => client.connection.close())
    this._clients.clear()
    this._peer?.destroy()
    this._peer = null
    this._options.onStatus('disabled', null)
  }

  setSession(session: PeerHostSession) {
    this._options.session = session
    this._clients.forEach((client, connection) => {
      this._deny(connection, 'revoked', 'The code was changed')
    })
    this.start()
  }

  revoke(clientId: string) {
    this._blocked.add(clientId)
    this._clients.forEach((client, connection) => {
      if (client.clientId === clientId) this._deny(connection, 'revoked', 'Access was revoked')
    })
    this._report()
  }

  broadcast(update: unknown) {
    const frame = update as {type?: string, update?: {timerId?: string}}

    // timerEngine and config are last-write-wins, so a newer one makes a queued one pointless.
    // set() fires on every keystroke in the time input, and config carries every timer's settings.
    if (frame.type === 'timerEngine' || frame.type === 'config') {
      const key = frame.type === 'config' ? 'config' : `timerEngine:${frame.update?.timerId ?? ''}`
      this._pending.set(key, update)
      this._scheduleFlush()
      return
    }

    this._sendNow(update)
  }

  private _scheduleFlush() {
    if (this._flushScheduled) return
    this._flushScheduled = true
    queueMicrotask(() => {
      this._flushScheduled = false
      const pending = [...this._pending.values()]
      this._pending.clear()
      pending.forEach(update => this._sendNow(update, true))
    })
  }

  private _sendNow(update: unknown, coalescable = false) {
    this._clients.forEach((client, connection) => {
      if (!connection.open) return
      // Dropping a stale tick is always safe; messages and audio cues are not replaceable
      if (coalescable && this._isBackedUp(connection)) return
      connection.send(update)
    })
  }

  private _isBackedUp(connection: DataConnection): boolean {
    const amount = (connection as unknown as {dataChannel?: RTCDataChannel}).dataChannel?.bufferedAmount
    return typeof amount === 'number' && amount > BACKPRESSURE_BYTES
  }

  private _accept(connection: DataConnection) {
    const pending: Client = {
      connection,
      clientId: '',
      name: 'Unknown',
      role: 'view',
      since: Date.now(),
      rttMs: null,
      tokens: COMMAND_BUCKET_SIZE,
      lastRefill: Date.now(),
      helloTimer: null,
    }

    // A peer that never introduces itself is dropped rather than left holding a channel
    pending.helloTimer = setTimeout(() => {
      if (!pending.clientId) this._deny(connection, 'unauthorised', 'No hello')
    }, HELLO_TIMEOUT_MS)

    connection.on('data', data => this._onData(connection, pending, data))
    connection.on('close', () => this._drop(connection))
    connection.on('error', () => this._drop(connection))
  }

  private async _onData(connection: DataConnection, pending: Client, data: unknown) {
    if (!isRtcFrame(data)) return

    if (data.type === 'hello') {
      await this._onHello(connection, pending, data.update as HelloUpdate)
      return
    }

    const client = this._clients.get(connection)
    if (!client) return

    if (data.type === 'pong') {
      const sent = (data.update as {t: number}).t
      client.rttMs = Date.now() - sent
      this._report()
      return
    }

    if (data.type === 'command') {
      if (client.role !== 'control') {
        this._error(connection, 'unauthorised', 'This link is view only')
        return
      }
      if (!this._takeToken(client)) {
        this._error(connection, 'rate-limited', 'Too many commands')
        return
      }

      const command = data.update as {id?: string}
      const result = await this._options.onCommand(command)
      if (command.id) {
        connection.send({type: 'ack', update: {id: command.id, ok: result.ok, error: result.error}})
      } else if (!result.ok) {
        this._error(connection, 'invalid-command', result.error ?? 'Rejected')
      }
    }
  }

  private async _onHello(connection: DataConnection, pending: Client, hello: HelloUpdate) {
    if (pending.helloTimer) clearTimeout(pending.helloTimer)
    pending.helloTimer = null

    if (typeof hello?.protocolVersion !== 'number' || hello.protocolVersion < MIN_SUPPORTED_PROTOCOL_VERSION) {
      this._deny(connection, 'unsupported-version', 'Update the remote page')
      return
    }

    const clientId = typeof hello.clientId === 'string' ? hello.clientId : ''
    if (!clientId || this._blocked.has(clientId)) {
      this._deny(connection, 'unauthorised', 'Not allowed')
      return
    }

    const role = this._roleFor(hello.key)
    if (!role) {
      this._deny(connection, 'unauthorised', 'Wrong code')
      return
    }

    pending.clientId = clientId
    pending.role = role
    pending.name = typeof hello.clientName === 'string' && hello.clientName ? hello.clientName.slice(0, 40) : 'Browser'

    if (this._options.requireApproval) {
      const allowed = await this._options.onApprovalRequest(clientId, pending.name)
      // The operator may have taken a while, and the peer can be long gone by now
      if (!connection.open) return
      if (!allowed) {
        this._deny(connection, 'unauthorised', 'Not approved on the host')
        return
      }
    }

    this._clients.set(connection, pending)

    connection.send({
      type: 'welcome',
      update: {
        protocolVersion: PROTOCOL_VERSION,
        minProtocolVersion: MIN_SUPPORTED_PROTOCOL_VERSION,
        appVersion: APP_VERSION,
        role,
        serverTime: Date.now(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        capabilities: [],
      },
    })

    connection.send({type: 'snapshot', update: await this._options.getSnapshot()})
    this._report()
  }

  private _roleFor(key: unknown): RtcRole | null {
    if (typeof key !== 'string') return null
    const {controlKey, viewKey} = this._options.session
    if (constantTimeEqual(key, controlKey)) return 'control'
    if (constantTimeEqual(key, viewKey)) return 'view'
    return null
  }

  private _takeToken(client: Client): boolean {
    const now = Date.now()
    const refill = ((now - client.lastRefill) / 1000) * COMMAND_REFILL_PER_SECOND
    client.tokens = Math.min(COMMAND_BUCKET_SIZE, client.tokens + refill)
    client.lastRefill = now
    if (client.tokens < 1) return false
    client.tokens -= 1
    return true
  }

  private _ping() {
    const t = Date.now()
    this._clients.forEach((client, connection) => {
      if (connection.open) connection.send({type: 'ping', update: {t}})
    })
  }

  private _error(connection: DataConnection, code: RtcErrorCode, message: string) {
    if (connection.open) connection.send({type: 'error', update: {code, message}})
  }

  private _deny(connection: DataConnection, code: RtcErrorCode, message: string) {
    this._error(connection, code, message)
    connection.close()
    this._drop(connection)
  }

  private _drop(connection: DataConnection) {
    const client = this._clients.get(connection)
    if (client?.helloTimer) clearTimeout(client.helloTimer)
    this._clients.delete(connection)
    this._report()
  }

  private _report() {
    this._options.onClients([...this._clients.values()]
      .filter(client => client.clientId)
      .map(({clientId, name, role, since, rttMs}) => ({clientId, name, role, since, rttMs})))
  }
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
