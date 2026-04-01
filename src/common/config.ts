import {ulid} from 'ulid'

export interface ColorThreshold {
  id: string
  type: 'minutes' | 'percent'
  value: number
  background: string
  text: string
  progressBar?: string
  progressBarTrack?: string
  clock?: string
  clockText?: string
}

export function getActiveThreshold(
  thresholds: ColorThreshold[],
  currentSeconds: number,
  setSeconds: number,
): ColorThreshold | null {
  if (thresholds.length === 0) return null

  const matching = thresholds.filter(t => {
    if (t.type === 'minutes') return currentSeconds / 60 <= t.value
    return setSeconds > 0 && (currentSeconds * 100 / setSeconds) <= t.value
  })

  if (matching.length === 0) return null

  return matching.reduce((best, t) => {
    const bestSec = best.type === 'minutes' ? best.value * 60 : best.value * setSeconds / 100
    const tSec = t.type === 'minutes' ? t.value * 60 : t.value * setSeconds / 100
    return tSec < bestSec ? t : best
  })
}

export const CURRENT_CONFIG_VERSION: number = 3

export const DEFAULT_TIMER_NAME = 'Timer'

export const DEFAULT_BACKGROUND_COLOR = '#000000ff';
export const DEFAULT_RESET_BACKGROUND_COLOR = '#000000ff';
export const DEFAULT_BACKGROUND_OPACITY = '255';
export const DEFAULT_TEXT_COLOR = '#ffffff';
export const DEFAULT_RESET_TEXT_COLOR = '#ffffff';
export const DEFAULT_EXPIRED_BACKGROUND_COLOR = '#000000ff';
export const DEFAULT_EXPIRED_TEXT_COLOR = '#ff0000';
export const DEFAULT_CLOCK_COLOR = '#ffffff';
export const DEFAULT_CLOCK_TEXT_COLOR = '#ffffff';
export const DEFAULT_PROGRESS_BAR_COLOR = '#22c55e';
export const DEFAULT_PROGRESS_BAR_TRACK_COLOR = '#bbf7d0';
export const DEFAULT_RESET_PROGRESS_BAR_COLOR = '#e5e7eb';
export const DEFAULT_RESET_CLOCK_COLOR = '#ffffff';
export const DEFAULT_RESET_CLOCK_TEXT_COLOR = '#ffffff';
export const DEFAULT_EXPIRED_PROGRESS_BAR_COLOR = '#b91c1c';
export const DEFAULT_EXPIRED_CLOCK_COLOR = '#ffffff';
export const DEFAULT_EXPIRED_CLOCK_TEXT_COLOR = '#ffffff';

export const DEFAULT_COLOR_THRESHOLD: ColorThreshold = {
  id: 'default',
  type: 'minutes',
  value: 2,
  background: '#000000ff',
  text: '#ffff00',
  progressBar: '#eab308',
  progressBarTrack: '#fef9c3',
  clock: DEFAULT_CLOCK_COLOR,
  clockText: DEFAULT_CLOCK_TEXT_COLOR,
};

export const DEFAULT_PRESETS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

export const DEFAULT_WEBSERVER_ENABLED = true;
export const DEFAULT_WEBSERVER_PORT = 6565;

export const DEFAULT_NDI_ENABLED = false;
export const DEFAULT_NDI_ALPHA = false;

export const DEFAULT_OSC_ENABLED = false;
export const DEFAULT_OSC_PORT = 6566;

export const DEFAULT_STOP_TIMER_AT_ZERO = false;
export const DEFAULT_SHOW_HOURS = false;
export const DEFAULT_PULSE_AT_ZERO = false;
export const DEFAULT_BLACK_AT_RESET = false;
export enum ContentAtReset {
  Empty = "EMPTY",
  Time = "TIME",
  Full = "FULL",
}
export const DEFAULT_CONTENT_AT_RESET: ContentAtReset = ContentAtReset.Full;
export const DEFAULT_TIMER_ALWAYS_ON_TOP = false;
export const DEFAULT_SET_WINDOW_ALWAYS_ON_TOP = false;

export const DEFAULT_SET_TIME_LIVE = false;

export const DEFAULT_USE_12_HOUR_CLOCK = false;

export const DEFAULT_TIMER_DURATION = 1000;

export const DEFAULT_MESSAGE_BOX_FIXED_HEIGHT = false;

export const DEFAULT_START_HIDDEN = false;

export enum CloseAction {
  Ask = "ASK",
  Hide = "HIDE",
  Close = "CLOSE",
}
export const DEFAULT_CLOSE_ACTION: CloseAction = CloseAction.Ask

export const DEFAULT_SHOW_SECTIONS: ShowSections = {
  timer: true,
  progress: true,
  clock: true,
  secondsOnClock: false,
  hours: DEFAULT_SHOW_HOURS,
  minusSignOnExtra: false,
};

export const DEFAULT_WINDOW_BOUNDS: WindowBounds = {
  alwaysOnTop: DEFAULT_TIMER_ALWAYS_ON_TOP,
  hidden: false,
  fullscreenOn: null,
  x: 100,
  y: 100,
  width: 1280,
  height: 720
}

export const DEFAULT_TIMER_COLORS: WindowColors = {
  background: DEFAULT_BACKGROUND_COLOR,
  text: DEFAULT_TEXT_COLOR,
  progressBar: DEFAULT_PROGRESS_BAR_COLOR,
  progressBarTrack: DEFAULT_PROGRESS_BAR_TRACK_COLOR,
  clock: DEFAULT_CLOCK_COLOR,
  clockText: DEFAULT_CLOCK_TEXT_COLOR,
  resetBackground: DEFAULT_RESET_BACKGROUND_COLOR,
  resetText: DEFAULT_RESET_TEXT_COLOR,
  resetProgressBar: DEFAULT_RESET_PROGRESS_BAR_COLOR,
  resetClock: DEFAULT_RESET_CLOCK_COLOR,
  resetClockText: DEFAULT_RESET_CLOCK_TEXT_COLOR,
  expiredBackground: DEFAULT_EXPIRED_BACKGROUND_COLOR,
  expiredText: DEFAULT_EXPIRED_TEXT_COLOR,
  expiredProgressBar: DEFAULT_EXPIRED_PROGRESS_BAR_COLOR,
  expiredClock: DEFAULT_EXPIRED_CLOCK_COLOR,
  expiredClockText: DEFAULT_EXPIRED_CLOCK_TEXT_COLOR,
  thresholds: [{ ...DEFAULT_COLOR_THRESHOLD, id: ulid() }],
}

export const DEFAULT_WINDOW_SETTINGS: WindowSettings = {
  bounds: DEFAULT_WINDOW_BOUNDS,
  show: DEFAULT_SHOW_SECTIONS,
  messageBoxFixedHeight: DEFAULT_MESSAGE_BOX_FIXED_HEIGHT,
  contentAtReset: DEFAULT_CONTENT_AT_RESET,
  colors: DEFAULT_TIMER_COLORS,
  pulseAtZero: DEFAULT_PULSE_AT_ZERO,
  use12HourClock: DEFAULT_USE_12_HOUR_CLOCK,
}

export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  name: DEFAULT_TIMER_NAME,
  timerDuration: DEFAULT_TIMER_DURATION,
  setTimeLive: DEFAULT_SET_TIME_LIVE,
  stopTimerAtZero: DEFAULT_STOP_TIMER_AT_ZERO,
  followTimer: null,
  audioFile: null,
  windows: {[ulid()]: DEFAULT_WINDOW_SETTINGS},
}

export const DEFAULT_REMOTE_SETTINGS: RemoteSettings = {
  webServerEnabled: DEFAULT_WEBSERVER_ENABLED,
  webServerPort: DEFAULT_WEBSERVER_PORT,
  ndiEnabled: DEFAULT_NDI_ENABLED,
  ndiAlpha: DEFAULT_NDI_ALPHA,
  oscEnabled: DEFAULT_OSC_ENABLED,
  oscPort: DEFAULT_OSC_PORT,
}

export const DEFAULT_STORE: CountdownConfiguration = {
  defaults: {
    settings: {
      presets: DEFAULT_PRESETS,
      remote: DEFAULT_REMOTE_SETTINGS,
      setWindowAlwaysOnTop: DEFAULT_SET_WINDOW_ALWAYS_ON_TOP,
      closeAction: DEFAULT_CLOSE_ACTION,
      startHidden: DEFAULT_START_HIDDEN,
      timers: { [ulid()]: DEFAULT_TIMER_SETTINGS},
    },
    version: CURRENT_CONFIG_VERSION
  }
}

export interface ShowSections {
  timer: boolean
  progress: boolean
  clock: boolean
  secondsOnClock: boolean
  hours: boolean
  minusSignOnExtra: boolean
}

export interface WindowBounds {
  alwaysOnTop: boolean
  hidden: boolean
  fullscreenOn: number | null
  x: number
  y: number
  width: number
  height: number
}

export interface WindowColors {
  background: string
  text: string
  progressBar: string
  progressBarTrack: string
  clock: string
  clockText: string
  resetBackground: string
  resetText: string
  resetProgressBar: string
  resetClock: string
  resetClockText: string
  expiredBackground: string
  expiredText: string
  expiredProgressBar: string
  expiredClock: string
  expiredClockText: string
  thresholds: ColorThreshold[]
}

export interface WindowSettings {
  bounds: WindowBounds
  show: ShowSections
  messageBoxFixedHeight: boolean
  contentAtReset: ContentAtReset
  colors: WindowColors
  pulseAtZero: boolean
  use12HourClock: boolean
}

export interface Windows {
  [key: string]: WindowSettings;
}

export interface TimerSettings {
  name: string
  timerDuration: number
  setTimeLive: boolean
  stopTimerAtZero: boolean
  followTimer: string
  audioFile: string
  windows: Windows
}

export interface RemoteSettings {
  webServerEnabled: boolean
  webServerPort: number
  ndiEnabled: boolean
  ndiAlpha: boolean
  oscEnabled: boolean
  oscPort: number
}

export interface Timers {
  [key: string]: TimerSettings;
}

export interface CountdownSettings {
  presets: number[]
  remote: RemoteSettings
  setWindowAlwaysOnTop: boolean
  closeAction: CloseAction,
  startHidden: boolean,
  timers: Timers
}

export interface CountdownStore {
  version?: number
  settings: CountdownSettings,
}

export interface CountdownConfiguration {
  defaults: CountdownStore
}
