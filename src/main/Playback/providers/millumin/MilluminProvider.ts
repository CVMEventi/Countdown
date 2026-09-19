import {
  DEFAULT_MILLUMIN_CONFIG,
  MILLUMIN_PROVIDER_ID,
  MilluminProviderConfig,
  PlaybackState,
} from "@common/playback.ts";
import type {PlaybackProviderContext} from "../../PlaybackProvider.ts";
import {oscSocketPool, OscSocketPool} from "../../osc/OscSocketPool.ts";
import {OscPushProvider} from "../../osc/OscPushProvider.ts";
import {MilluminTracker, parseMilluminAddress} from "./milluminOsc.ts";

/**
 * Mirrors the layer Millumin is playing, over its OSC feedback.
 *
 * Read only, and push rather than poll: Millumin sends to us, so there is nothing to request. The
 * socket comes from a pool, so several sources watching different layers of the same Millumin
 * share one listener rather than fighting over the port.
 */
export class MilluminProvider extends OscPushProvider<MilluminProviderConfig> {
  readonly id = MILLUMIN_PROVIDER_ID

  private _tracker = new MilluminTracker()

  constructor(context: PlaybackProviderContext, pool: OscSocketPool = oscSocketPool) {
    super(context, pool, DEFAULT_MILLUMIN_CONFIG)
  }

  protected defaults() {
    return DEFAULT_MILLUMIN_CONFIG
  }

  protected label() {
    return this._config.layer ? `Millumin/${this._config.layer}` : 'Millumin'
  }

  protected identity(config: MilluminProviderConfig) {
    return [config.port, config.layer, config.playingTimeout, config.logMessages].join('|')
  }

  protected listenPort(config: MilluminProviderConfig) {
    return Number(config.port)
  }

  protected listeningHint(port: number) {
    return `listening on 0.0.0.0:${port} — point Millumin's OSC feedback here (Device manager, OSC tab, "API feedback")`
  }

  protected verboseLogging() {
    return this._config.logMessages === true
  }

  protected isRepeating(address: string) {
    return address.endsWith('/media/time')
  }

  protected describeAddress(address: string) {
    const parsed = parseMilluminAddress(address)
    return parsed ? `(layer "${parsed.layer}", ${parsed.path})` : '(ignored: not a layer media address)'
  }

  protected handleMessage(address: string, args: unknown[], now: number) {
    this._tracker.handleMessage(address, args, now)
  }

  protected computeState(now: number): PlaybackState | null {
    return this._tracker.state(now, {
      layer: this._config.layer,
      playingTimeoutMs: Number(this._config.playingTimeout) || DEFAULT_MILLUMIN_CONFIG.playingTimeout,
    })
  }

  protected resetProtocol() {
    this._tracker.clear()
  }

  protected idleDetail() {
    const layers = this._tracker.snapshot()
    if (layers.length === 0) return null

    return layers.map(layer => ({
      layer: layer.layer,
      name: layer.name,
      duration: layer.duration,
      elapsed: layer.elapsed,
      paused: layer.paused,
    }))
  }
}
