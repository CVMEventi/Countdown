import type {PlaybackState} from "@common/playback.ts";

/**
 * GrandShow EE's central control protocol, with no socket in sight so it stays unit testable.
 *
 * One JSON object per UDP datagram to port 30303, answered from 30303 to whichever port asked.
 * Replies do not echo the command, so each kind is recognised by its fields:
 *
 *   -> {"cmd":"getPlayingNode"}    <- {"nodes":[node, ...],"playingNodeNumber":"1"}
 *   -> {"cmd":"getPausingNode"}    <- {"nodes":null,"pausingNodeNumber":"0"}
 *   -> {"cmd":"getServiceStatus"}  <- {"sevice": "running"}   (sic)
 *
 * Errors come back as bare strings such as "COMMAND ERROR", not JSON.
 * Times are {H, M, S, Mi} objects, Mi being milliseconds.
 */

export const GRANDSHOW_QUERIES = {
  playing: {cmd: 'getPlayingNode'},
  paused: {cmd: 'getPausingNode'},
  service: {cmd: 'getServiceStatus'},
} as const

export interface GrandShowNode {
  id: number
  row: number
  col: number
  startMs: number
  endMs: number
  curMs: number
  durMs: number
}

export type GrandShowReply =
  | {kind: 'playing', nodes: GrandShowNode[]}
  | {kind: 'paused', nodes: GrandShowNode[]}
  | {kind: 'service', running: boolean}
  | {kind: 'error', message: string}

// A node is addressed by row alone (a whole window) or by row and column (one node)
export interface GrandShowPin {
  row: number
  col: number | null
}

export function encodeQuery(query: object): Buffer {
  return Buffer.from(JSON.stringify(query))
}

export function timeToMs(value: unknown): number | null {
  if (!value || typeof value !== 'object') return null
  const time = value as {[key: string]: unknown}
  const parts = [time.H, time.M, time.S, time.Mi].map(part => Number(part ?? 0))
  if (parts.some(part => !Number.isFinite(part))) return null
  const [hours, minutes, seconds, millis] = parts
  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis
}

function parseNode(value: unknown): GrandShowNode | null {
  if (!value || typeof value !== 'object') return null
  const node = value as {[key: string]: unknown}
  const position = (node.nodePosition ?? {}) as {[key: string]: unknown}

  const row = Number(position.row)
  const col = Number(position.col)
  const startMs = timeToMs(node.nodeStartTime) ?? 0
  const endMs = timeToMs(node.nodeEndTime)
  const curMs = timeToMs(node.nodeCurTime)
  if (!Number.isFinite(row) || !Number.isFinite(col) || endMs === null || curMs === null) return null

  return {
    id: Number(node.nodeId),
    row,
    col,
    startMs,
    endMs,
    curMs,
    durMs: timeToMs(node.nodeDurTime) ?? endMs - startMs,
  }
}

function parseNodes(value: unknown): GrandShowNode[] {
  // An empty list arrives as null rather than []
  if (!Array.isArray(value)) return []
  return value.map(parseNode).filter((node): node is GrandShowNode => node !== null)
}

export function parseGrandShowReply(datagram: Buffer | string): GrandShowReply | null {
  const text = datagram.toString().trim()
  if (!text) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    // Errors are bare strings; anything else unparseable (getPos, getCountDown) is not ours
    if (/ERROR$|^row or col error$|^no clip on this position$/.test(text)) return {kind: 'error', message: text}
    return null
  }

  if (!parsed || typeof parsed !== 'object') return null
  const reply = parsed as {[key: string]: unknown}

  if ('playingNodeNumber' in reply) return {kind: 'playing', nodes: parseNodes(reply.nodes)}
  if ('pausingNodeNumber' in reply) return {kind: 'paused', nodes: parseNodes(reply.nodes)}

  // GrandShow spells it "sevice"; accept the documented spelling too in case a later version fixes it
  const service = reply.sevice ?? reply.service
  if (typeof service === 'string') return {kind: 'service', running: service === 'running'}

  return null
}

/** Accepts "2" for a window row, or "1,3", "1 3" and "R1C3" for one node. Empty follows anything. */
export function parsePin(value: string): GrandShowPin | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const match = /^r?\s*(\d+)(?:\s*(?:[,\s]|c)\s*(\d+))?$/i.exec(trimmed)
  if (!match) return null

  return {row: Number(match[1]), col: match[2] === undefined ? null : Number(match[2])}
}

/**
 * Which nodes this source is willing to mirror, best first: playing before paused, then top row
 * first, since the first window is usually the main one.
 */
export function candidateNodes(playing: GrandShowNode[], paused: GrandShowNode[], pin: GrandShowPin | null) {
  const byPosition = (a: GrandShowNode, b: GrandShowNode) => a.row - b.row || a.col - b.col
  const matches = (node: GrandShowNode) => !pin || (node.row === pin.row && (pin.col === null || node.col === pin.col))
  const playingKeys = new Set(playing.map(nodeKey))

  return [
    ...playing.filter(matches).sort(byPosition).map(node => ({node, isRunning: true})),
    ...paused.filter(node => matches(node) && !playingKeys.has(nodeKey(node))).sort(byPosition).map(node => ({node, isRunning: false})),
  ]
}

export function nodeKey(node: GrandShowNode) {
  return `${node.row},${node.col}`
}

export function nodeTitle(node: GrandShowNode) {
  return `R${node.row}C${node.col}`
}

export function buildPlaybackState(node: GrandShowNode, isRunning: boolean): PlaybackState | null {
  const durMs = node.durMs > 0 ? node.durMs : node.endMs - node.startMs
  if (durMs <= 0) return null

  // A clip that reached its end holds its last frame and is still reported as playing
  const remainingMs = node.endMs - node.curMs
  if (remainingMs <= 0) return null

  return {
    clipId: `${node.id}@${nodeKey(node)}`,
    title: nodeTitle(node),
    remainingSeconds: Math.ceil(remainingMs / 1000),
    totalSeconds: Math.round(durMs / 1000),
    isRunning,
    isLooping: false,
  }
}
