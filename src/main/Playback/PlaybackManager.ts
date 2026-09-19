import {
  playbackProviderMeta,
  PlaybackProviderStatus,
  PlaybackSettings,
  PlaybackState,
  playbackStateEquals,
  resolveSourceConfig,
} from "@common/playback.ts";
import type {PlaybackProvider, PlaybackProviderFactory} from "./PlaybackProvider.ts";
import {playbackProviderFactories} from "./providers/index.ts";

export interface PlaybackManagerDeps {
  onState: (sourceId: string, state: PlaybackState | null) => void
  onStatus: (statuses: PlaybackProviderStatus[]) => void
  factories?: {[providerId: string]: PlaybackProviderFactory}
  now?: () => number
  // Test seam: the sweep that expires states a provider stopped refreshing
  sweepInterval?: number
}

const DEFAULT_SWEEP_INTERVAL = 250
const DEFAULT_STALE_AFTER = 1000

interface Instance {
  provider: PlaybackProvider
  providerId: string
}

/**
 * Owns every configured playback source and the three concerns that are identical for all of
 * them, so a new provider only has to speak its own protocol:
 *
 *  - de-duplication, so a fast poller does not turn into a flood of IPC
 *  - staleness, so a source that goes quiet releases the timers instead of freezing them
 *  - status fan-out to the renderer
 *
 * Sources are instances, not provider kinds: two vMix rigs, or two layers of one Millumin, each
 * get their own provider object keyed by source id.
 */
export class PlaybackManager {
  private _instances = new Map<string, Instance>()
  private _states = new Map<string, { state: PlaybackState, refreshedAt: number }>()
  private _lastStatusKey: string | null = null
  private _sweepTimer: NodeJS.Timeout = null
  private _deps: PlaybackManagerDeps
  private _factories: {[providerId: string]: PlaybackProviderFactory}
  private _now: () => number
  private _sweepInterval: number

  constructor(deps: PlaybackManagerDeps) {
    this._deps = deps
    this._now = deps.now ?? (() => Date.now())
    this._sweepInterval = deps.sweepInterval ?? DEFAULT_SWEEP_INTERVAL
    this._factories = deps.factories ?? playbackProviderFactories
  }

  applyState(playback: PlaybackSettings | undefined) {
    const sources = playback ?? {}

    // Drop sources that were deleted, or whose provider kind changed under the same id
    Array.from(this._instances.keys()).forEach(sourceId => {
      const source = sources[sourceId]
      if (source && source.provider === this._instances.get(sourceId).providerId) return
      this._destroy(sourceId)
    })

    Object.entries(sources).forEach(([sourceId, source]) => {
      const factory = this._factories[source.provider]
      if (!factory) return

      let instance = this._instances.get(sourceId)
      if (!instance) {
        instance = {
          providerId: source.provider,
          provider: factory({
            onState: (state) => this._providerState(sourceId, state),
            onStatus: () => this._pushStatus(),
            now: this._now,
          }),
        }
        this._instances.set(sourceId, instance)
      }

      instance.provider.applyConfig(resolveSourceConfig(source))
    })

    this._startSweep()
    this._pushStatus()
  }

  stop() {
    this._stopSweep()
    Array.from(this._instances.keys()).forEach(sourceId => this._destroy(sourceId))
    this._pushStatus()
  }

  statuses(): PlaybackProviderStatus[] {
    return Array.from(this._instances.entries())
      .map(([sourceId, instance]) => ({...instance.provider.status(), id: sourceId}))
  }

  stateFor(sourceId: string): PlaybackState | null {
    return this._states.get(sourceId)?.state ?? null
  }

  private _destroy(sourceId: string) {
    const instance = this._instances.get(sourceId)
    if (!instance) return
    instance.provider.stop()
    this._instances.delete(sourceId)
    // Release every timer following it: no further refresh will arrive to expire the state
    this._clearState(sourceId)
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

    Array.from(this._states.entries()).forEach(([sourceId, entry]) => {
      const providerId = this._instances.get(sourceId)?.providerId
      const staleAfter = (providerId ? playbackProviderMeta(providerId)?.staleAfterMs : null) ?? DEFAULT_STALE_AFTER
      if (now - entry.refreshedAt <= staleAfter) return
      this._clearState(sourceId)
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
