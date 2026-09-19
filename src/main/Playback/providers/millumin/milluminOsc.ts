import type {PlaybackState} from "@common/playback.ts";

/**
 * Millumin's OSC feedback, with no socket in sight so it stays unit testable.
 *
 * Millumin pushes rather than answering queries, so this keeps a picture of every layer it has
 * heard about and answers "what should the timers show" on demand.
 *
 * Addresses (Device manager > OSC > API feedback):
 *   /millumin/layer:<name>/mediaStarted   [index, name, duration?]
 *   /millumin/layer:<name>/mediaPaused    [index, name, duration?]
 *   /millumin/layer:<name>/mediaStopped   [index, name, duration?]
 *   /millumin/layer:<name>/media/time     [elapsed, duration]
 * `index:<n>` and `selectedLayer` are accepted in place of `layer:<name>`.
 * Times are floats in seconds.
 */

export interface MilluminLayer {
  layer: string
  name: string | null
  duration: number
  elapsed: number
  paused: boolean
  // Ordering for "most recently started", and freshness for a layer that claims to be playing
  startedOrder: number
  timeSeenAt: number
}

export interface MilluminAddress {
  layer: string
  path: string
}

import type {OscMessage} from "../../osc/OscSocketPool.ts";

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

export interface MilluminStateOptions {
  layer: string
  playingTimeoutMs: number
}

const PREFIX = '/millumin/'

export function parseMilluminAddress(address: string): MilluminAddress | null {
  if (!address.startsWith(PREFIX)) return null

  const rest = address.slice(PREFIX.length)
  const separator = rest.indexOf('/')
  if (separator <= 0) return null

  const target = rest.slice(0, separator)
  const path = rest.slice(separator + 1)

  if (target.startsWith('layer:')) return {layer: target.slice('layer:'.length), path}
  if (target.startsWith('index:')) return {layer: target, path}
  if (target === 'selectedLayer') return {layer: target, path}

  // board, light:..., and anything else carry no media time
  return null
}

function toNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : NaN
}

export class MilluminTracker {
  private _layers = new Map<string, MilluminLayer>()
  private _order = 0
  private _lastPacketAt = 0

  get lastPacketAt() {
    return this._lastPacketAt
  }

  clear() {
    this._layers.clear()
  }

  /** The layers as they currently stand, for logging when nothing is being mirrored. */
  snapshot(): MilluminLayer[] {
    return Array.from(this._layers.values())
  }

  handleMessage(address: string, args: unknown[], now: number) {
    const parsed = parseMilluminAddress(address)
    if (!parsed) return

    this._lastPacketAt = now

    switch (parsed.path) {
      case 'mediaStarted':
        this._started(parsed.layer, args, now)
        return
      case 'mediaPaused':
        this._setPaused(parsed.layer, true, now)
        return
      case 'mediaResumed':
        this._setPaused(parsed.layer, false, now)
        return
      case 'mediaStopped':
        this._layers.delete(parsed.layer)
        return
      case 'media/time':
        this._time(parsed.layer, args, now)
        return
      default:
    }
  }

  private _started(layer: string, args: unknown[], now: number) {
    const name = typeof args[1] === 'string' ? args[1] : null
    const duration = toNumber(args[2])
    const existing = this._layers.get(layer)

    this._layers.set(layer, {
      layer,
      name,
      // A still image reports no duration; keep whatever media/time tells us later
      duration: Number.isFinite(duration) ? duration : (existing?.duration ?? 0),
      elapsed: 0,
      paused: false,
      startedOrder: ++this._order,
      timeSeenAt: now,
    })
  }

  private _setPaused(layer: string, paused: boolean, now: number) {
    const existing = this._layers.get(layer)
    if (!existing) return
    existing.paused = paused
    existing.timeSeenAt = now
  }

  private _time(layer: string, args: unknown[], now: number) {
    const elapsed = toNumber(args[0])
    const duration = toNumber(args[1])
    if (!Number.isFinite(elapsed)) return

    const existing = this._layers.get(layer)

    if (!existing) {
      // selectedLayer only ever sends media/time, so a layer can be born here
      this._layers.set(layer, {
        layer,
        name: null,
        duration: Number.isFinite(duration) ? duration : 0,
        elapsed,
        paused: false,
        startedOrder: ++this._order,
        timeSeenAt: now,
      })
      return
    }

    existing.elapsed = elapsed
    if (Number.isFinite(duration)) existing.duration = duration
    existing.timeSeenAt = now
  }

  /**
   * The layer the timers should mirror, or null for nothing playing.
   *
   * A playing layer has to keep sending media/time; when it stops, Millumin has gone away and the
   * layer is dropped. A paused layer is held until Millumin says it stopped, because a paused
   * clip sends nothing at all.
   */
  state(now: number, options: MilluminStateOptions): PlaybackState | null {
    this._dropStalePlayingLayers(now, options.playingTimeoutMs)

    const candidates = Array.from(this._layers.values())
      .filter(layer => (options.layer ? layer.layer === options.layer : true))
      .filter(layer => layer.duration > 0)

    if (candidates.length === 0) return null

    // A layer still running wins over a paused one, then the most recently started
    const chosen = candidates.sort((a, b) => {
      if (a.paused !== b.paused) return a.paused ? 1 : -1
      return b.startedOrder - a.startedOrder
    })[0]

    const remaining = chosen.duration - chosen.elapsed
    if (remaining <= 0) return null

    return {
      clipId: `${chosen.layer}:${chosen.name ?? ''}:${chosen.startedOrder}`,
      title: chosen.name,
      remainingSeconds: Math.ceil(remaining),
      totalSeconds: Math.round(chosen.duration),
      isRunning: !chosen.paused,
      isLooping: false,
    }
  }

  private _dropStalePlayingLayers(now: number, playingTimeoutMs: number) {
    this._layers.forEach((layer, key) => {
      if (layer.paused) return
      if (now - layer.timeSeenAt <= playingTimeoutMs) return
      this._layers.delete(key)
    })
  }
}
