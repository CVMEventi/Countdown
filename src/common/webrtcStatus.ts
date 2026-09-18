import type {RtcRole} from './protocol.ts'

export type WebRtcConnectionState =
  | 'disabled'
  | 'starting'
  | 'signaling'
  | 'online'
  | 'failed'

export interface WebRtcClient {
  clientId: string
  name: string
  role: RtcRole
  since: number
  rttMs: number | null
}

export interface WebRtcSession {
  sessionId: string
  controlKey: string
  viewKey: string
}

export interface WebRtcStatus {
  enabled: boolean
  state: WebRtcConnectionState
  peerId: string | null
  controlCode: string | null
  viewCode: string | null
  lastError: string | null
  clients: WebRtcClient[]
}
