import type {PlaybackState} from "@common/playback.ts";
import type {OscMessage} from "../../osc/OscSocketPool.ts";

/**
 * QLab's OSC dictionary, with no socket in sight so it stays unit testable.
 *
 * Unlike Millumin, QLab answers questions rather than announcing things, so a source asks twice
 * per poll: once for what is running, once for the times of the cue it picked.
 *
 *   -> /runningOrPausedCues                     <- /reply/runningOrPausedCues  {"data":[cue, ...]}
 *   -> /cue_id/<id>/valuesForKeys ["a","b"]     <- /reply/cue_id/<id>/valuesForKeys {"data":{...}}
 *
 * Every reply carries one JSON string argument. Times are doubles in seconds.
 */

export const QLAB_VALUE_KEYS = ['actionElapsed', 'currentDuration', 'isPaused', 'isRunning', 'listName'] as const

export interface QLabReply {
  // The address that was asked, as QLab echoes it back inside the payload
  address: string
  status: string
  data: unknown
  workspaceId: string | null
}

export interface QLabCue {
  uniqueID: string
  number: string
  name: string
  listName: string
  type: string
}

export interface QLabCueValues {
  actionElapsed: number
  currentDuration: number
  isPaused: boolean
  isRunning: boolean
  listName: string | null
}

export function parseQLabReply(message: OscMessage): QLabReply | null {
  const [address, payload] = message
  if (!address.startsWith('/reply/')) return null
  if (typeof payload !== 'string') return null

  let parsed: {[key: string]: unknown}
  try {
    parsed = JSON.parse(payload)
  } catch {
    return null
  }

  return {
    // The echoed address is more reliable than the reply address, which QLab prefixes
    address: typeof parsed.address === 'string' ? parsed.address : address.slice('/reply'.length),
    status: typeof parsed.status === 'string' ? parsed.status : 'ok',
    data: parsed.data,
    workspaceId: typeof parsed.workspace_id === 'string' ? parsed.workspace_id : null,
  }
}

/** Pulls the cue id out of an echoed /cue_id/<id>/... address. */
export function cueIdFromAddress(address: string): string | null {
  const match = /\/cue_id\/([^/]+)\//.exec(address)
  return match ? match[1] : null
}

/**
 * Group cues carry their children in a nested `cues` array, so the list has to be walked rather
 * than read: the media actually elapsing is usually a child.
 */
export function flattenCues(data: unknown): QLabCue[] {
  if (!Array.isArray(data)) return []

  const cues: QLabCue[] = []
  data.forEach(entry => {
    if (!entry || typeof entry !== 'object') return
    const cue = entry as {[key: string]: unknown}

    cues.push({
      uniqueID: String(cue.uniqueID ?? ''),
      number: String(cue.number ?? ''),
      name: String(cue.name ?? ''),
      listName: String(cue.listName ?? ''),
      type: String(cue.type ?? ''),
    })

    cues.push(...flattenCues(cue.cues))
  })

  return cues.filter(cue => cue.uniqueID !== '')
}

/**
 * Which cues this source is willing to mirror.
 *
 * With nothing configured every running cue is a candidate, ranked so a real media cue is taken
 * before the group wrapped around it. A cue number or name pins the source to one cue.
 */
export function candidateCues(cues: QLabCue[], wanted: string): QLabCue[] {
  const trimmed = wanted.trim()

  if (trimmed) {
    const lowered = trimmed.toLowerCase()
    return cues.filter(cue =>
      cue.number.trim().toLowerCase() === lowered
      || cue.name.trim().toLowerCase() === lowered
      || cue.uniqueID === trimmed)
  }

  // Groups keep their place but yield to the cue doing the playing
  return [...cues].sort((a, b) => Number(a.type === 'Group') - Number(b.type === 'Group'))
}

export function parseCueValues(data: unknown): QLabCueValues | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const values = data as {[key: string]: unknown}

  const elapsed = Number(values.actionElapsed)
  const duration = Number(values.currentDuration)
  if (!Number.isFinite(elapsed) || !Number.isFinite(duration)) return null

  return {
    actionElapsed: elapsed,
    currentDuration: duration,
    isPaused: values.isPaused === true || values.isPaused === 1,
    // QLab omits isRunning from some cue types; a cue we were told is running counts as running
    isRunning: values.isRunning === undefined ? true : (values.isRunning === true || values.isRunning === 1),
    listName: typeof values.listName === 'string' ? values.listName : null,
  }
}

export function buildPlaybackState(cue: QLabCue, values: QLabCueValues): PlaybackState | null {
  if (values.currentDuration <= 0) return null

  const remaining = values.currentDuration - values.actionElapsed
  if (remaining <= 0) return null

  return {
    clipId: cue.uniqueID,
    title: cue.listName || cue.name || cue.number || null,
    // Ceil so the cue reads the way the engine counts: 1 until the last whole second is gone
    remainingSeconds: Math.ceil(remaining),
    totalSeconds: Math.round(values.currentDuration),
    isRunning: values.isRunning && !values.isPaused,
    isLooping: false,
  }
}

/** Prefixes an address with the workspace, when one is configured. */
export function workspaceAddress(address: string, workspaceId: string): string {
  const trimmed = workspaceId.trim()
  return trimmed ? `/workspace/${trimmed}${address}` : address
}
