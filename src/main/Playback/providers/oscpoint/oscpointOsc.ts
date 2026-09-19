import type {PlaybackState} from "@common/playback.ts";

/**
 * OSCPoint's feedback, with no socket in sight so it stays unit testable.
 *
 * The PowerPoint add-in announces the media on the current slide as a stream of single-value
 * messages, so the picture has to be assembled from them rather than read from one packet:
 *
 *   /oscpoint/slideshow/media/state          [playing|paused|stopped|notready]
 *   /oscpoint/slideshow/media/remaining      [int ms]   already allows for a trimmed end point
 *   /oscpoint/slideshow/media/duration       [int ms]
 *   /oscpoint/slideshow/media/durationtrimmed[int ms]   v2.1+, the length actually played
 *   /oscpoint/slideshow/media/position       [int ms]
 *   /oscpoint/slideshow/state                [edit|running|paused]
 *   /oscpoint/slideshow/currentslide         [int, 1-based]
 *   /oscpoint/presentation/name              [string]
 *
 * Media messages repeat every 500ms while playing and stop otherwise, so a playing deck has to
 * keep proving it is alive while a paused one is held until OSCPoint says it stopped.
 */

const PREFIX = '/oscpoint/'

export type OscPointMediaState = 'playing' | 'paused' | 'stopped' | 'notready' | ''

export interface OscPointSnapshot {
  mediaState: OscPointMediaState
  remainingMs: number
  durationMs: number
  durationTrimmedMs: number
  positionMs: number
  slideshowState: string
  currentSlide: number
  presentation: string
  mediaSeenAt: number
}

function toNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : NaN
}

function toText(value: unknown): string {
  if (typeof value === 'string') return value
  // OSCPoint pairs an ASCII string with a UTF-8 blob for names that need it
  if (value instanceof Uint8Array) return Buffer.from(value).toString('utf8')
  return ''
}

export function isOscPointAddress(address: string): boolean {
  return address.startsWith(PREFIX)
}

export class OscPointTracker {
  private _state: OscPointSnapshot = OscPointTracker.empty()

  static empty(): OscPointSnapshot {
    return {
      mediaState: '',
      remainingMs: NaN,
      durationMs: NaN,
      durationTrimmedMs: NaN,
      positionMs: NaN,
      slideshowState: '',
      currentSlide: 0,
      presentation: '',
      mediaSeenAt: 0,
    }
  }

  clear() {
    this._state = OscPointTracker.empty()
  }

  snapshot(): OscPointSnapshot {
    return {...this._state}
  }

  handleMessage(address: string, args: unknown[], now: number) {
    if (!isOscPointAddress(address)) return

    const value = args[0]

    switch (address) {
      case '/oscpoint/slideshow/media/state': {
        const next = toText(value).toLowerCase() as OscPointMediaState
        // A media that stopped leaves nothing worth keeping, and its old times would linger
        if (next === 'stopped' || next === 'notready') this._clearMedia()
        this._state.mediaState = next
        this._state.mediaSeenAt = now
        return
      }
      case '/oscpoint/slideshow/media/remaining':
        this._state.remainingMs = toNumber(value)
        this._state.mediaSeenAt = now
        return
      case '/oscpoint/slideshow/media/duration':
        this._state.durationMs = toNumber(value)
        this._state.mediaSeenAt = now
        return
      case '/oscpoint/slideshow/media/durationtrimmed':
        this._state.durationTrimmedMs = toNumber(value)
        this._state.mediaSeenAt = now
        return
      case '/oscpoint/slideshow/media/position':
        this._state.positionMs = toNumber(value)
        this._state.mediaSeenAt = now
        return
      case '/oscpoint/slideshow/state': {
        const next = toText(value).toLowerCase()
        // Leaving the slideshow ends any media with it
        if (next === 'edit') this._clearMedia()
        this._state.slideshowState = next
        return
      }
      case '/oscpoint/slideshow/currentslide': {
        const slide = toNumber(value)
        // A new slide means new media: drop the old times rather than count down the wrong thing
        if (Number.isFinite(slide) && slide !== this._state.currentSlide) this._clearMedia()
        if (Number.isFinite(slide)) this._state.currentSlide = slide
        return
      }
      case '/oscpoint/presentation/name':
        this._state.presentation = toText(args[1]) || toText(value)
        return
      default:
    }
  }

  private _clearMedia() {
    this._state.mediaState = ''
    this._state.remainingMs = NaN
    this._state.durationMs = NaN
    this._state.durationTrimmedMs = NaN
    this._state.positionMs = NaN
  }

  /**
   * What the timers should show, or null for nothing playing.
   *
   * A playing deck must keep sending, because OSCPoint repeats every 500ms while it plays. A
   * paused one is held: it sends nothing at all until it moves again.
   */
  state(now: number, options: {playingTimeoutMs: number}): PlaybackState | null {
    const snapshot = this._state

    if (snapshot.mediaState !== 'playing' && snapshot.mediaState !== 'paused') return null
    if (snapshot.mediaState === 'playing' && now - snapshot.mediaSeenAt > options.playingTimeoutMs) return null

    const total = firstFinite(snapshot.durationTrimmedMs, snapshot.durationMs)
    if (!Number.isFinite(total) || total <= 0) return null

    // `remaining` already allows for a trimmed end point, so it beats duration minus position
    const remaining = Number.isFinite(snapshot.remainingMs)
      ? snapshot.remainingMs
      : total - snapshot.positionMs
    if (!Number.isFinite(remaining) || remaining <= 0) return null

    return {
      clipId: `${snapshot.presentation}:${snapshot.currentSlide}:${Math.round(total)}`,
      title: describe(snapshot),
      remainingSeconds: Math.ceil(remaining / 1000),
      totalSeconds: Math.round(total / 1000),
      isRunning: snapshot.mediaState === 'playing',
      isLooping: false,
    }
  }
}

function firstFinite(...values: number[]): number {
  return values.find(value => Number.isFinite(value) && value > 0) ?? NaN
}

function describe(snapshot: OscPointSnapshot): string | null {
  const slide = snapshot.currentSlide > 0 ? `slide ${snapshot.currentSlide}` : ''
  if (snapshot.presentation && slide) return `${snapshot.presentation} — ${slide}`
  return snapshot.presentation || slide || null
}
