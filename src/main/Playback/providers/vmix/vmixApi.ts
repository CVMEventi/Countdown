import {XMLParser} from "fast-xml-parser";
import type {PlaybackState} from "@common/playback.ts";

export interface VMixInput {
  key: string
  number: number
  type: string
  title: string
  state: string
  position: number
  duration: number
  loop: boolean
}

export interface VMixApiState {
  active: number | null
  preview: number | null
  inputs: VMixInput[]
}

// Input types that carry a real playhead. Anything else on Program means no clip is playing.
const PLAYABLE_TYPES = new Set(['Video', 'VideoList', 'AudioFile', 'Audio'])

// Below this a "duration" is noise rather than a clip worth counting down
const MIN_DURATION_MS = 1000

// Attributes are coerced here rather than by the parser so a malformed value becomes null instead
// of NaN leaking into the timers
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: false,
  trimValues: true,
})

function toNumber(value: unknown): number {
  if (value === undefined || value === null || value === '') return NaN
  return Number(value)
}

function toArray<T>(value: T | T[] | undefined): T[] {
  // vMix emits a bare object when there is exactly one input
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

export function parseVmixApi(xml: string): VMixApiState {
  const parsed = parser.parse(xml) as {[key: string]: unknown}
  const vmix = parsed?.vmix as {[key: string]: unknown} | undefined

  if (!vmix) throw new Error('Not a vMix API response')

  const inputsNode = vmix.inputs as {input?: unknown} | undefined
  const rawInputs = toArray(inputsNode?.input as {[key: string]: unknown} | {[key: string]: unknown}[])

  const inputs: VMixInput[] = rawInputs.map(input => ({
    key: String(input['@_key'] ?? ''),
    number: toNumber(input['@_number']),
    type: String(input['@_type'] ?? ''),
    title: String(input['@_title'] ?? ''),
    state: String(input['@_state'] ?? ''),
    position: toNumber(input['@_position']),
    duration: toNumber(input['@_duration']),
    loop: String(input['@_loop'] ?? '') === 'True',
  }))

  const active = toNumber(vmix.active)
  const preview = toNumber(vmix.preview)

  return {
    active: Number.isFinite(active) ? active : null,
    preview: Number.isFinite(preview) ? preview : null,
    inputs,
  }
}

function activeInput(state: VMixApiState): VMixInput | null {
  if (state.active === null) return null
  return state.inputs.find(candidate => candidate.number === state.active) ?? null
}

/**
 * A source pinned to one input follows it wherever it is, on Program or not: that is the point of
 * pinning it. Matched by number first, then by title, so either is usable in the settings.
 */
function findInput(state: VMixApiState, wanted: string): VMixInput | null {
  const asNumber = Number(wanted)
  if (Number.isFinite(asNumber)) {
    const byNumber = state.inputs.find(candidate => candidate.number === asNumber)
    if (byNumber) return byNumber
  }

  const lowered = wanted.trim().toLowerCase()
  return state.inputs.find(candidate => candidate.title.trim().toLowerCase() === lowered) ?? null
}

/**
 * Turns a vMix state into the clip the timers should mirror, or null for "no clip playing".
 *
 * Every reason not to take over lives here, in one pure function, so the edge cases are testable
 * without a vMix on the network.
 */
export function selectPlaybackState(
  state: VMixApiState,
  options: { followLooping: boolean, input?: string },
): PlaybackState | null {
  const input = options.input ? findInput(state, options.input) : activeInput(state)
  if (!input) return null
  if (!PLAYABLE_TYPES.has(input.type)) return null
  if (input.state !== 'Running' && input.state !== 'Paused') return null
  if (!Number.isFinite(input.duration) || input.duration < MIN_DURATION_MS) return null
  if (!Number.isFinite(input.position)) return null
  // A looping bed would otherwise hijack the timers for the whole show
  if (input.loop && !options.followLooping) return null

  const remainingMs = input.duration - input.position
  if (remainingMs <= 0) return null

  return {
    clipId: input.key || String(input.number),
    title: input.title || null,
    // Ceil so the clip reads the way the engine counts: 1 until the last whole second is gone
    remainingSeconds: Math.ceil(remainingMs / 1000),
    totalSeconds: Math.round(input.duration / 1000),
    isRunning: input.state === 'Running',
    isLooping: input.loop,
  }
}
