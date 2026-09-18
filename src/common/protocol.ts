import type {
  AudioStateWebSocketUpdate,
  AudioWebSocketUpdate,
  ConfigWebSocketUpdate,
  MessageWebSocketUpdate,
  TimerEngineWebSocketUpdate,
  TimerSnapshot,
  WebSocketUpdate,
} from './TimerInterfaces.ts'

/**
 * The wire contract between the desktop app and a WebRTC remote client.
 *
 * This module is the one the browser SPA also needs, so it must stay free of electron, node and
 * vue imports: types and pure functions only.
 */

export const PROTOCOL_VERSION = 1
// Raise only when a change genuinely cannot be understood by an older client
export const MIN_SUPPORTED_PROTOCOL_VERSION = 1

export type RtcRole = 'control' | 'view'

/**
 * One verb per ITimerController method, with the same argument names.
 *
 * Deliberately strings rather than the IpcTimerCommandName enum: that enum is numeric, so its
 * values are declaration order and reordering a member would silently remap verbs on the wire.
 */
export type RtcCommand =
  | { id?: string, verb: 'set', timerId: string, seconds: number }
  | { id?: string, verb: 'start', timerId: string }
  | { id?: string, verb: 'reset', timerId: string }
  | { id?: string, verb: 'toggle', timerId: string }
  | { id?: string, verb: 'jogSet', timerId: string, seconds: number }
  | { id?: string, verb: 'jogCurrent', timerId: string, seconds: number }
  | { id?: string, verb: 'sendMessage', timerId: string, message: string }
  | { id?: string, verb: 'stopSound', timerId: string }

export type RtcCommandVerb = RtcCommand['verb']

export const RTC_COMMAND_VERBS: RtcCommandVerb[] = [
  'set', 'start', 'reset', 'toggle', 'jogSet', 'jogCurrent', 'sendMessage', 'stopSound',
]

const VERBS_WITH_SECONDS: RtcCommandVerb[] = ['set', 'jogSet', 'jogCurrent']

// A timer running for longer than this is a malformed or hostile command, not a real cue
export const MAX_COMMAND_SECONDS = 100 * 60 * 60
export const MAX_MESSAGE_LENGTH = 500

export interface HelloUpdate {
  protocolVersion: number
  clientId: string
  key: string
  clientName?: string
}

export interface WelcomeUpdate {
  protocolVersion: number
  minProtocolVersion: number
  appVersion: string
  role: RtcRole
  serverTime: number
  // The desktop formats timerEndsAt as local wall clock, so a client elsewhere needs to say whose
  timeZone: string
  capabilities: string[]
}

export interface AckUpdate {
  id: string
  ok: boolean
  error?: string
}

export interface PingUpdate {
  t: number
}

export type RtcErrorCode =
  | 'unsupported-version'
  | 'unauthorised'
  | 'unknown-timer'
  | 'invalid-command'
  | 'rate-limited'
  | 'revoked'

export interface RtcErrorUpdate {
  code: RtcErrorCode
  message: string
}

export type RtcFrame =
  | WebSocketUpdate<HelloUpdate> & { type: 'hello' }
  | WebSocketUpdate<WelcomeUpdate> & { type: 'welcome' }
  | WebSocketUpdate<TimerSnapshot> & { type: 'snapshot' }
  | WebSocketUpdate<RtcCommand> & { type: 'command' }
  | WebSocketUpdate<AckUpdate> & { type: 'ack' }
  | WebSocketUpdate<PingUpdate> & { type: 'ping' }
  | WebSocketUpdate<PingUpdate> & { type: 'pong' }
  | WebSocketUpdate<RtcErrorUpdate> & { type: 'error' }
  | WebSocketUpdate<TimerEngineWebSocketUpdate> & { type: 'timerEngine' }
  | WebSocketUpdate<ConfigWebSocketUpdate> & { type: 'config' }
  | WebSocketUpdate<MessageWebSocketUpdate> & { type: 'message' }
  | WebSocketUpdate<AudioWebSocketUpdate> & { type: 'audio' }
  | WebSocketUpdate<AudioWebSocketUpdate> & { type: 'audioStop' }
  | WebSocketUpdate<AudioStateWebSocketUpdate> & { type: 'audioState' }

export function isRtcFrame(value: unknown): value is RtcFrame {
  if (typeof value !== 'object' || value === null) return false
  const frame = value as { type?: unknown, update?: unknown }
  return typeof frame.type === 'string' && typeof frame.update === 'object' && frame.update !== null
}

/**
 * Room codes.
 *
 * Crockford base32 drops I, L, O and U, so a code read off a screen and typed into a phone cannot
 * be confused between 1/l/I or 0/O, and there is no vowel to form an accidental word. Eight
 * characters is 40 bits: enough that probing a public broker for a live room is not viable.
 */
export const ROOM_CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
export const ROOM_CODE_LENGTH = 8
export const PEER_ID_PREFIX = 'cvm-countdown-'

const CROCKFORD_SUBSTITUTIONS: Record<string, string> = {
  I: '1', L: '1', O: '0', U: 'V',
}

/**
 * Accepts whatever the user actually pasted: a bare code, a dashed one, a full pairing URL, or a
 * code typed with letters the alphabet excludes. Returns '' when nothing usable is left.
 */
export function normalizeRoomCode(input: string): string {
  if (typeof input !== 'string') return ''

  // A pasted pairing URL carries the code in the hash fragment
  const fragment = input.includes('#') ? input.slice(input.lastIndexOf('#') + 1) : input
  const trimmed = fragment.includes('/') ? fragment.slice(fragment.lastIndexOf('/') + 1) : fragment

  const normalized = trimmed
    .toUpperCase()
    .split('')
    .map(character => CROCKFORD_SUBSTITUTIONS[character] ?? character)
    .filter(character => ROOM_CODE_ALPHABET.includes(character))
    .join('')

  return normalized.slice(0, ROOM_CODE_LENGTH)
}

export function isValidRoomCode(code: string): boolean {
  return normalizeRoomCode(code).length === ROOM_CODE_LENGTH
}

// Grouped for reading aloud and typing, never for comparison
export function formatRoomCode(code: string): string {
  const normalized = normalizeRoomCode(code)
  if (normalized.length !== ROOM_CODE_LENGTH) return normalized
  return `${normalized.slice(0, 4)}-${normalized.slice(4)}`
}

export function roomCodeToPeerId(code: string): string {
  return PEER_ID_PREFIX + normalizeRoomCode(code).toLowerCase()
}

export interface PairingCode {
  sessionId: string
  key: string
}

// The session id addresses the peer and the key authorises a role, so the key must not be the
// thing a viewer needs in order to connect at all
export function formatPairingCode({sessionId, key}: PairingCode): string {
  return `${formatRoomCode(sessionId)}.${formatRoomCode(key)}`
}

export function parsePairingCode(input: string): PairingCode | null {
  if (typeof input !== 'string') return null

  const fragment = input.includes('#') ? input.slice(input.lastIndexOf('#') + 1) : input
  const tail = fragment.includes('/') ? fragment.slice(fragment.lastIndexOf('/') + 1) : fragment

  const [rawSession, rawKey] = tail.split('.')
  if (rawKey === undefined) return null

  const sessionId = normalizeRoomCode(rawSession)
  const key = normalizeRoomCode(rawKey)
  if (sessionId.length !== ROOM_CODE_LENGTH || key.length !== ROOM_CODE_LENGTH) return null

  return {sessionId, key}
}

export interface CommandValidationResult {
  ok: boolean
  code?: RtcErrorCode
  message?: string
  command?: RtcCommand
}

/**
 * Nothing upstream validates commands: the main process IPC handler trusts its caller. A remote
 * peer is not trusted, so everything it sends is checked here before it reaches a timer.
 */
export function validateCommand(value: unknown, timerExists: (timerId: string) => boolean): CommandValidationResult {
  if (typeof value !== 'object' || value === null) {
    return {ok: false, code: 'invalid-command', message: 'Command must be an object'}
  }

  const candidate = value as Record<string, unknown>
  const verb = candidate.verb

  if (typeof verb !== 'string' || !RTC_COMMAND_VERBS.includes(verb as RtcCommandVerb)) {
    return {ok: false, code: 'invalid-command', message: `Unknown verb ${String(verb)}`}
  }

  if (typeof candidate.timerId !== 'string' || candidate.timerId === '') {
    return {ok: false, code: 'invalid-command', message: 'timerId must be a non-empty string'}
  }

  if (!timerExists(candidate.timerId)) {
    return {ok: false, code: 'unknown-timer', message: `No timer ${candidate.timerId}`}
  }

  if (candidate.id !== undefined && typeof candidate.id !== 'string') {
    return {ok: false, code: 'invalid-command', message: 'id must be a string when present'}
  }

  if (VERBS_WITH_SECONDS.includes(verb as RtcCommandVerb)) {
    const seconds = candidate.seconds
    if (typeof seconds !== 'number' || !Number.isFinite(seconds)) {
      return {ok: false, code: 'invalid-command', message: 'seconds must be a finite number'}
    }
    if (Math.abs(seconds) > MAX_COMMAND_SECONDS) {
      return {ok: false, code: 'invalid-command', message: 'seconds out of range'}
    }
    if (verb === 'set' && seconds < 0) {
      return {ok: false, code: 'invalid-command', message: 'set seconds must not be negative'}
    }
  }

  if (verb === 'sendMessage') {
    const message = candidate.message
    if (typeof message !== 'string') {
      return {ok: false, code: 'invalid-command', message: 'message must be a string'}
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return {ok: false, code: 'invalid-command', message: 'message too long'}
    }
  }

  return {ok: true, command: candidate as unknown as RtcCommand}
}
