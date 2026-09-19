/**
 * The contract between a playback system (vMix, Mitti, Millumin, QLab, ...) and the timers.
 *
 * Lives in common because the renderer builds its settings UI from the provider list, and because
 * config.ts must stay free of main process imports. Types and plain data only: no electron, no
 * node, no transport code.
 */

/** What a provider reports about the item currently playing. Times are whole seconds. */
export interface PlaybackState {
  // Identity of the playing item, so a change of clip is detectable even at the same remaining time
  clipId: string | null
  title: string | null
  remainingSeconds: number
  totalSeconds: number
  isRunning: boolean
  isLooping: boolean
}

export interface PlaybackProviderStatus {
  id: string
  enabled: boolean
  connected: boolean
  lastError: string | null
  activeTitle: string | null
}

export type PlaybackProviderConfig = { enabled: boolean } & Record<string, unknown>

export interface PlaybackSettings {
  [providerId: string]: PlaybackProviderConfig
}

export interface PlaybackProviderMeta {
  id: string
  displayName: string
  defaultConfig: PlaybackProviderConfig
  // A state not refreshed within this window is dropped, which is what lets one rule cover both a
  // poller falling silent and a push source going quiet
  staleAfterMs: number
}

export const VMIX_PROVIDER_ID = 'vmix'

export interface VMixProviderConfig extends PlaybackProviderConfig {
  host: string
  port: number
  username: string
  password: string
  pollInterval: number
  followLooping: boolean
}

export const DEFAULT_VMIX_CONFIG: VMixProviderConfig = {
  enabled: false,
  host: '127.0.0.1',
  port: 8088,
  username: '',
  password: '',
  pollInterval: 250,
  followLooping: false,
}

export const VMIX_PROVIDER_META: PlaybackProviderMeta = {
  id: VMIX_PROVIDER_ID,
  displayName: 'vMix',
  defaultConfig: DEFAULT_VMIX_CONFIG,
  staleAfterMs: 1000,
}

export const MILLUMIN_PROVIDER_ID = 'millumin'

export interface MilluminProviderConfig extends PlaybackProviderConfig {
  // Millumin pushes to us, so this is the port we listen on: set it as the feedback target in
  // Millumin's Device manager (CMD+K, OSC tab, "API feedback")
  port: number
  // Empty follows whichever layer is playing; a name pins the timers to one layer
  layer: string
  // A playing layer must keep sending media/time. Silence this long means Millumin went away.
  playingTimeout: number
  // Logs every OSC packet to the console. Off by default: media/time arrives many times a second.
  logMessages: boolean
}

export const DEFAULT_MILLUMIN_CONFIG: MilluminProviderConfig = {
  enabled: false,
  // Not 5000: that is Millumin's own OSC input port, which clashes when both run on one machine
  port: 5001,
  layer: '',
  playingTimeout: 2000,
  logMessages: false,
}

export const MILLUMIN_PROVIDER_META: PlaybackProviderMeta = {
  id: MILLUMIN_PROVIDER_ID,
  displayName: 'Millumin',
  defaultConfig: DEFAULT_MILLUMIN_CONFIG,
  staleAfterMs: 1000,
}

// Adding a provider means adding its meta here, a factory in main/Playback/providers, and a
// settings component in the renderer. Nothing else in the app needs to know about it.
export const PLAYBACK_PROVIDERS: PlaybackProviderMeta[] = [
  VMIX_PROVIDER_META,
  MILLUMIN_PROVIDER_META,
]

export function playbackProviderMeta(id: string): PlaybackProviderMeta | null {
  return PLAYBACK_PROVIDERS.find(provider => provider.id === id) ?? null
}

export const DEFAULT_PLAYBACK_SETTINGS: PlaybackSettings = Object.fromEntries(
  PLAYBACK_PROVIDERS.map(provider => [provider.id, {...provider.defaultConfig}]),
)

/** Fills in the defaults for providers missing from a stored config. */
export function resolvePlaybackConfig(
  settings: PlaybackSettings | undefined,
  providerId: string,
): PlaybackProviderConfig {
  const meta = playbackProviderMeta(providerId)
  if (!meta) return {enabled: false}
  return {...meta.defaultConfig, ...(settings?.[providerId] ?? {})}
}

export function playbackStateEquals(a: PlaybackState | null, b: PlaybackState | null): boolean {
  if (a === null || b === null) return a === b
  return a.clipId === b.clipId
    && a.remainingSeconds === b.remainingSeconds
    && a.totalSeconds === b.totalSeconds
    && a.isRunning === b.isRunning
}
