/**
 * The contract between a playback system (vMix, Millumin, Mitti, QLab, ...) and the timers.
 *
 * A *provider* is a kind of system Countdown can speak to. A *source* is one configured instance
 * of a provider: a machine, or a single layer on a machine. Timers follow a source, so one vMix
 * rig and two Millumin layers can drive three different timers at once.
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
  // The source id, not the provider id: two sources of the same kind report separately
  id: string
  enabled: boolean
  connected: boolean
  lastError: string | null
  activeTitle: string | null
}

export type PlaybackProviderConfig = { enabled: boolean } & Record<string, unknown>

/** One configured instance of a provider. Keyed by a ULID, as timers and windows are. */
export interface PlaybackSource {
  name: string
  provider: string
  config: PlaybackProviderConfig
}

export interface PlaybackSettings {
  [sourceId: string]: PlaybackSource
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
  // Empty follows whatever is on Program; an input number or title pins this source to one input
  input: string
}

export const DEFAULT_VMIX_CONFIG: VMixProviderConfig = {
  enabled: true,
  host: '127.0.0.1',
  port: 8088,
  username: '',
  password: '',
  pollInterval: 250,
  followLooping: false,
  input: '',
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
  // Millumin's Device manager (CMD+K, OSC tab, "API feedback"). Sources sharing a port share one
  // socket, so several layers of one Millumin machine need no extra setup on the Millumin side.
  port: number
  // Empty follows whichever layer is playing; a name pins this source to one layer
  layer: string
  // A playing layer must keep sending media/time. Silence this long means Millumin went away.
  playingTimeout: number
  // Logs every OSC packet to the console. Off by default: media/time arrives many times a second.
  logMessages: boolean
}

export const DEFAULT_MILLUMIN_CONFIG: MilluminProviderConfig = {
  enabled: true,
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

export const QLAB_PROVIDER_ID = 'qlab'

export interface QLabProviderConfig extends PlaybackProviderConfig {
  host: string
  port: number
  // We ask from this local port so replies land here, whether QLab answers the sender's port or
  // its documented default of 53001
  replyPort: number
  // Blank asks every workspace listening; a workspace id or name targets one
  workspace: string
  passcode: string
  // Empty follows whichever cue is running; a cue number, name or id pins this source to one
  cue: string
  pollInterval: number
}

export const DEFAULT_QLAB_CONFIG: QLabProviderConfig = {
  enabled: true,
  host: '127.0.0.1',
  port: 53000,
  replyPort: 53001,
  workspace: '',
  passcode: '',
  cue: '',
  pollInterval: 500,
}

export const QLAB_PROVIDER_META: PlaybackProviderMeta = {
  id: QLAB_PROVIDER_ID,
  displayName: 'QLab',
  defaultConfig: DEFAULT_QLAB_CONFIG,
  staleAfterMs: 2000,
}

export const OSCPOINT_PROVIDER_ID = 'oscpoint'

export interface OscPointProviderConfig extends PlaybackProviderConfig {
  // OSCPoint pushes to us: set this machine and port as the remote host in PowerPoint's OSCPoint
  // ribbon tab. One add-in reports one deck, so a second presentation machine is a second source.
  port: number
  // Media messages repeat every 500ms while playing. Silence this long means OSCPoint went away.
  playingTimeout: number
  logMessages: boolean
}

export const DEFAULT_OSCPOINT_CONFIG: OscPointProviderConfig = {
  enabled: true,
  // OSCPoint's own default feedback port
  port: 35550,
  playingTimeout: 2000,
  logMessages: false,
}

export const OSCPOINT_PROVIDER_META: PlaybackProviderMeta = {
  id: OSCPOINT_PROVIDER_ID,
  displayName: 'OSCPoint',
  defaultConfig: DEFAULT_OSCPOINT_CONFIG,
  staleAfterMs: 1000,
}

export const GRANDSHOW_PROVIDER_ID = 'grandshow'

export interface GrandShowProviderConfig extends PlaybackProviderConfig {
  host: string
  // GrandShow's central control port. Replies come back to whichever local port asked, so there
  // is no reply port to configure.
  port: number
  // Empty follows whichever node is playing; "2" pins a window row, "1,3" or "R1C3" one node
  node: string
  pollInterval: number
}

export const DEFAULT_GRANDSHOW_CONFIG: GrandShowProviderConfig = {
  enabled: true,
  host: '127.0.0.1',
  port: 30303,
  node: '',
  pollInterval: 250,
}

export const GRANDSHOW_PROVIDER_META: PlaybackProviderMeta = {
  id: GRANDSHOW_PROVIDER_ID,
  displayName: 'GrandShow',
  defaultConfig: DEFAULT_GRANDSHOW_CONFIG,
  staleAfterMs: 1000,
}

// Adding a provider means adding its meta here, a factory in main/Playback/providers, and a
// settings component in the renderer. Nothing else in the app needs to know about it.
export const PLAYBACK_PROVIDERS: PlaybackProviderMeta[] = [
  VMIX_PROVIDER_META,
  MILLUMIN_PROVIDER_META,
  QLAB_PROVIDER_META,
  OSCPOINT_PROVIDER_META,
  GRANDSHOW_PROVIDER_META,
]

export function playbackProviderMeta(id: string): PlaybackProviderMeta | null {
  return PLAYBACK_PROVIDERS.find(provider => provider.id === id) ?? null
}

// Sources are added by hand, so a fresh install has none
export const DEFAULT_PLAYBACK_SETTINGS: PlaybackSettings = {}

/** Fills in the defaults for keys a stored source predates. */
export function resolveSourceConfig(source: PlaybackSource | undefined): PlaybackProviderConfig {
  const meta = source ? playbackProviderMeta(source.provider) : null
  if (!meta) return {enabled: false}
  return {...meta.defaultConfig, ...(source?.config ?? {})}
}

export function playbackSourceLabel(sourceId: string, settings: PlaybackSettings | undefined): string {
  const source = settings?.[sourceId]
  if (!source) return sourceId
  if (source.name) return source.name
  return playbackProviderMeta(source.provider)?.displayName ?? source.provider
}

/** A name for a newly added source, unique enough to tell two of a kind apart at a glance. */
export function defaultSourceName(providerId: string, settings: PlaybackSettings | undefined): string {
  const displayName = playbackProviderMeta(providerId)?.displayName ?? providerId
  const sameKind = Object.values(settings ?? {}).filter(source => source.provider === providerId).length
  return sameKind === 0 ? displayName : `${displayName} ${sameKind + 1}`
}

export function playbackStateEquals(a: PlaybackState | null, b: PlaybackState | null): boolean {
  if (a === null || b === null) return a === b
  return a.clipId === b.clipId
    && a.remainingSeconds === b.remainingSeconds
    && a.totalSeconds === b.totalSeconds
    && a.isRunning === b.isRunning
}
