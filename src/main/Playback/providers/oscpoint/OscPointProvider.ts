import {
  DEFAULT_OSCPOINT_CONFIG,
  OSCPOINT_PROVIDER_ID,
  OscPointProviderConfig,
  PlaybackState,
} from "@common/playback.ts";
import type {PlaybackProviderContext} from "../../PlaybackProvider.ts";
import {oscSocketPool, OscSocketPool} from "../../osc/OscSocketPool.ts";
import {OscPushProvider} from "../../osc/OscPushProvider.ts";
import {isOscPointAddress, OscPointTracker} from "./oscpointOsc.ts";

/**
 * Mirrors the media playing on the current PowerPoint slide, over OSCPoint's feedback.
 *
 * Read only, and push rather than poll. OSCPoint has no layer or cue to choose between — one
 * add-in reports one deck — so a second presentation machine is a second source on its own port.
 */
export class OscPointProvider extends OscPushProvider<OscPointProviderConfig> {
  readonly id = OSCPOINT_PROVIDER_ID

  private _tracker = new OscPointTracker()

  constructor(context: PlaybackProviderContext, pool: OscSocketPool = oscSocketPool) {
    super(context, pool, DEFAULT_OSCPOINT_CONFIG)
  }

  protected defaults() {
    return DEFAULT_OSCPOINT_CONFIG
  }

  protected label() {
    return 'OSCPoint'
  }

  protected identity(config: OscPointProviderConfig) {
    return [config.port, config.playingTimeout, config.logMessages].join('|')
  }

  protected listenPort(config: OscPointProviderConfig) {
    return Number(config.port)
  }

  protected listeningHint(port: number) {
    return `listening on 0.0.0.0:${port} — set this machine and port as the remote host in PowerPoint's OSCPoint ribbon tab`
  }

  protected verboseLogging() {
    return this._config.logMessages === true
  }

  protected isRepeating(address: string) {
    return address.startsWith('/oscpoint/slideshow/media/')
  }

  protected describeAddress(address: string) {
    return isOscPointAddress(address) ? null : '(ignored: not an OSCPoint address)'
  }

  protected handleMessage(address: string, args: unknown[], now: number) {
    this._tracker.handleMessage(address, args, now)
  }

  protected computeState(now: number): PlaybackState | null {
    return this._tracker.state(now, {
      playingTimeoutMs: Number(this._config.playingTimeout) || DEFAULT_OSCPOINT_CONFIG.playingTimeout,
    })
  }

  protected resetProtocol() {
    this._tracker.clear()
  }

  protected idleDetail() {
    if (this._packetCount === 0) return null

    const snapshot = this._tracker.snapshot()
    if (!snapshot.mediaState) {
      return `no media on slide ${snapshot.currentSlide || '?'} (slideshow "${snapshot.slideshowState || 'unknown'}")`
    }

    return {
      mediaState: snapshot.mediaState,
      remainingMs: snapshot.remainingMs,
      durationMs: snapshot.durationMs,
      durationTrimmedMs: snapshot.durationTrimmedMs,
      slide: snapshot.currentSlide,
    }
  }
}
