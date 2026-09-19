import type {PlaybackProviderConfig, PlaybackProviderStatus, PlaybackState} from "@common/playback.ts";

/**
 * What a provider is handed when it is built.
 *
 * Dependencies are injected rather than imported so a provider stays unit testable: the manager
 * supplies the real clock and fetch, a test supplies fakes.
 */
export interface PlaybackProviderContext {
  // Publishes a state AND keeps it alive: a state the provider stops refreshing is expired by the
  // manager, which is what lets one rule cover a poller falling silent and a push source going quiet
  onState: (state: PlaybackState | null) => void
  onStatus: () => void
  now: () => number
  fetchFn: typeof fetch
}

/**
 * A playback system Countdown can mirror. The provider owns its transport and nothing else:
 * de-duplication, staleness and status fan-out are the manager's job, so every future provider
 * gets them for free.
 */
export interface PlaybackProvider {
  readonly id: string
  applyConfig(config: PlaybackProviderConfig): void
  stop(): void
  status(): PlaybackProviderStatus
}

export type PlaybackProviderFactory = (context: PlaybackProviderContext) => PlaybackProvider
