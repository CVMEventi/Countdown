import type {RtcRole} from './protocol.ts'
import {buildWebRemoteUrl} from './protocol.ts'

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

export type RemoteShareAvailability = 'disabled' | 'unconfigured' | 'offline' | 'ready'

export interface RemoteShareTarget {
  id: string
  label: string
  availability: RemoteShareAvailability
  url: string
  code: string
  reason: string
  caution?: string
}

export interface RemoteShareInput {
  enabled: boolean
  state: WebRtcConnectionState
  code: string | null
  spaUrl: string
  rotation: 'session' | 'manual'
  id: string
  label: string
  role: RtcRole
  timerId?: string
  windowId?: string
}

// A scheme-less address builds a URL that looks fine and goes nowhere, so it counts as unset
function isUsableSpaUrl(spaUrl: string): boolean {
  try {
    const {protocol} = new URL(spaUrl)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

function cautionFor(role: RtcRole, rotation: 'session' | 'manual'): string {
  const access = role === 'control'
    ? 'Full control of every timer. Share only with your operator.'
    : 'Anyone with this link can watch every timer, not just this one.'

  return rotation === 'session' ? `${access} The link stops working when the app restarts.` : access
}

export function resolveRemoteShare(input: RemoteShareInput): RemoteShareTarget {
  const base = {id: input.id, label: input.label, code: input.code ?? '', url: ''}

  if (!input.enabled) {
    return {...base, availability: 'disabled', reason: 'Enable the web remote in Remote settings to share beyond this network.'}
  }

  if (!isUsableSpaUrl(input.spaUrl)) {
    return {...base, availability: 'unconfigured', reason: 'Set the remote page address in Remote settings, including https://.'}
  }

  if (input.state !== 'online' || !input.code) {
    const reason = input.state === 'failed'
      ? 'The web remote could not start.'
      : 'Waiting for the web remote to come online.'
    return {...base, availability: 'offline', reason}
  }

  const url = buildWebRemoteUrl({
    spaUrl: input.spaUrl,
    code: input.code,
    timerId: input.timerId,
    windowId: input.windowId,
  })

  if (!url) {
    return {...base, availability: 'offline', reason: 'Waiting for the web remote to come online.'}
  }

  return {...base, availability: 'ready', url, reason: '', caution: cautionFor(input.role, input.rotation)}
}
