export const DEFAULT_BACKGROUND_COLOR = '#000000ff';
export const DEFAULT_RESET_BACKGROUND_COLOR = '#000000ff';
export const DEFAULT_BACKGROUND_OPACITY = '255';
export const DEFAULT_TEXT_COLOR = '#ffffff';
export const DEFAULT_TIMER_FINISHED_TEXT_COLOR = '#ff0000';
export const DEFAULT_CLOCK_COLOR = '#ffffff';
export const DEFAULT_CLOCK_TEXT_COLOR = '#ffffff';

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
export const DEFAULT_YELLOW_AT_OPTION = 'minutes';
export const DEFAULT_YELLOW_AT_MINUTES = 2;
export const DEFAULT_YELLOW_AT_PERCENT = 10;

export const DEFAULT_SET_TIME_LIVE = false;

export const DEFAULT_USE_12_HOUR_CLOCK = false;

export const DEFAULT_AUDIO_ENABLED = false;

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
};

export const DEFAULT_WINDOW_BOUNDS: WindowBounds = {
  fullscreenOn: null,
  x: 100,
  y: 100,
  width: 1280,
  height: 720
}

export const DEFAULT_STORE: CountdownConfiguration = {
  defaults: {
    settings: {
      backgroundColor: DEFAULT_BACKGROUND_COLOR,
      resetBackgroundColor: DEFAULT_RESET_BACKGROUND_COLOR,
      textColor: DEFAULT_TEXT_COLOR,
      timerFinishedTextColor: DEFAULT_TIMER_FINISHED_TEXT_COLOR,
      clockColor: DEFAULT_CLOCK_COLOR,
      clockTextColor: DEFAULT_CLOCK_TEXT_COLOR,
      presets: DEFAULT_PRESETS,
      stopTimerAtZero: DEFAULT_STOP_TIMER_AT_ZERO,
      blackAtReset: DEFAULT_BLACK_AT_RESET,
      contentAtReset: DEFAULT_CONTENT_AT_RESET,
      showHours: DEFAULT_SHOW_HOURS,
      pulseAtZero: DEFAULT_PULSE_AT_ZERO,
      webServerEnabled: DEFAULT_WEBSERVER_ENABLED,
      webServerPort: DEFAULT_WEBSERVER_PORT,
      ndiEnabled: DEFAULT_NDI_ENABLED,
      ndiAlpha: DEFAULT_NDI_ALPHA,
      oscEnabled: DEFAULT_OSC_ENABLED,
      oscPort: DEFAULT_OSC_PORT,
      show: DEFAULT_SHOW_SECTIONS,
      timerAlwaysOnTop: DEFAULT_TIMER_ALWAYS_ON_TOP,
      setWindowAlwaysOnTop: DEFAULT_SET_WINDOW_ALWAYS_ON_TOP,
      yellowAtOption: DEFAULT_YELLOW_AT_OPTION,
      yellowAtMinutes: DEFAULT_YELLOW_AT_MINUTES,
      yellowAtPercent: DEFAULT_YELLOW_AT_PERCENT,
      audioEnabled: DEFAULT_AUDIO_ENABLED,
      timerDuration: DEFAULT_TIMER_DURATION,
      setTimeLive: DEFAULT_SET_TIME_LIVE,
      use12HourClock: DEFAULT_USE_12_HOUR_CLOCK,
      messageBoxFixedHeight: DEFAULT_MESSAGE_BOX_FIXED_HEIGHT,
      closeAction: DEFAULT_CLOSE_ACTION,
      startHidden: DEFAULT_START_HIDDEN,
    },
    window: DEFAULT_WINDOW_BOUNDS,
  }
}

export interface ShowSections {
  timer: boolean,
  progress: boolean,
  clock: boolean,
  secondsOnClock: boolean,
}

export interface WindowBounds {
  fullscreenOn: number,
  x: number,
  y: number,
  width: number,
  height: number
}

export interface CountdownSettings {
  backgroundColor: string
  resetBackgroundColor: string
  textColor: string
  timerFinishedTextColor: string
  clockColor: string
  clockTextColor: string
  presets: number[]
  stopTimerAtZero: boolean
  blackAtReset: boolean
  contentAtReset: ContentAtReset
  showHours: boolean
  pulseAtZero: boolean
  webServerEnabled: boolean
  webServerPort: number
  ndiEnabled: boolean
  ndiAlpha: boolean
  oscEnabled: boolean
  oscPort: number
  show: ShowSections
  timerAlwaysOnTop: boolean
  setWindowAlwaysOnTop: boolean
  yellowAtOption: string
  yellowAtMinutes: number
  yellowAtPercent: number
  audioEnabled: boolean
  timerDuration: number
  setTimeLive: boolean
  use12HourClock: boolean
  messageBoxFixedHeight: boolean,
  closeAction: CloseAction,
  startHidden: boolean,
}

export interface CountdownStore {
  settings: CountdownSettings,
  window: WindowBounds,
}

export interface CountdownConfiguration {
  defaults: CountdownStore
}
