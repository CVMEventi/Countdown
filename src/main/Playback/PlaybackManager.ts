import {
  PLAYBACK_PROVIDERS,
  PlaybackProviderStatus,
  PlaybackSettings,
  PlaybackState,
  playbackStateEquals,
  resolvePlaybackConfig,
} from "@common/playback.ts";
import type {PlaybackProvider, PlaybackProviderFactory} from "./PlaybackProvider.ts";
import {playbackProviderFactories} from "./providers/index.ts";

export interface PlaybackManagerDeps {
  onState: (sourceId: string, state: PlaybackState | null) => void
  onStatus: (statuses: PlaybackProviderStatus[]) => void
  factories?: {[providerId: string]: PlaybackProviderFactory}
  now?: () => number
  fetchFn?: typeof fetch
  // Test seam: the sweep that expires states a provider stopped refreshing
  sweepInterval?: number
}

const DEFAULT_SWEEP_INTERVAL = 250

/**
 * Owns every playback provider and the three concerns that are identical for all of them, so a
 * new provider only has to speak its own protocol:
 *
 *  - de-duplication, so a fast poller does not turn into a flood of IPC
 *  - staleness, so a source that goes quiet releases the timers instead of freezing them
 *  - status fan-out to the renderer
 */
export class PlaybackManager {
  private _providers = new Map<string, PlaybackProvider>()
  private _states = new Map<string, { state: PlaybackState, refreshedAt: number }>()
  private _lastStatusKey: string | null = null
  private _sweepTimer: NodeJS.Timeout = null
  private _deps: PlaybackManagerDeps
  private _now: () => number
  private _sweepInterval: number

  constructor(deps: PlaybackManagerDeps) {
    this._deps = deps
    this._now = deps.now ?? (() => Date.now())
    this._sweepInterval = deps.sweepInterval ?? DEFAULT_SWEEP_INTERVAL

    const factories = deps.factories ?? playbackProviderFactories

    PLAYBACK_PROVIDERS.forEach(meta => {
      const factory = factories[meta.id]
      if (!factory) return

      this._providers.set(meta.id, factory({
        onState: (state) => this._providerState(meta.id, state),
        onStatus: () => this._pushStatus(),
        now: this._now,
        fetchFn: deps.fetchFn ?? ((input, init) => fetch(input, init)),
      }))
    })
  }

  applyState(playback: PlaybackSettings | undefined) {
    this._providers.forEach((provider, id) => {
      provider.applyConfig(resolvePlaybackConfig(playback, id))
    })

    this._startSweep()
    this._pushStatus()
  }

  stop() {
    this._stopSweep()
    this._providers.forEach(provider => provider.stop())
    // Release every timer before going quiet: no further refresh will arrive to expire them
    Array.from(this._states.keys()).forEach(id => this._clearState(id))
    this._pushStatus()
  }

  statuses(): PlaybackProviderStatus[] {
    return Array.from(this._providers.values()).map(provider => provider.status())
  }

  stateFor(sourceId: string): PlaybackState | null {
    return this._states.get(sourceId)?.state ?? null
  }

  private _providerState(sourceId: string, state: PlaybackState | null) {
    if (state === null) {
      this._clearState(sourceId)
      return
    }

    const previous = this._states.get(sourceId)
    this._states.set(sourceId, {state, refreshedAt: this._now()})

    if (previous && playbackStateEquals(previous.state, state)) return
    this._deps.onState(sourceId, state)
  }

  private _clearState(sourceId: string) {
    if (!this._states.has(sourceId)) return
    this._states.delete(sourceId)
    this._deps.onState(sourceId, null)
  }

  private _startSweep() {
    if (this._sweepTimer) return
    this._sweepTimer = setInterval(this._sweep.bind(this), this._sweepInterval)
  }

  private _stopSweep() {
    if (!this._sweepTimer) return
    clearInterval(this._sweepTimer)
    this._sweepTimer = null
  }

  // A state the provider stopped refreshing is dropped, so one lost poll or OSC packet does not
  // flicker the display but a real outage hands the timers back
  private _sweep() {
    const now = this._now()

    PLAYBACK_PROVIDERS.forEach(meta => {
      const entry = this._states.get(meta.id)
      if (!entry) return
      if (now - entry.refreshedAt <= meta.staleAfterMs) return
      this._clearState(meta.id)
    })
  }

  private _pushStatus() {
    const statuses = this.statuses()
    const key = JSON.stringify(statuses)
    if (key === this._lastStatusKey) return
    this._lastStatusKey = key
    this._deps.onStatus(statuses)
  }
}
