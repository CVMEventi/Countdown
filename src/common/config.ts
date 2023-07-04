const DEFAULT_BACKGROUND_COLOR = '#000000';
const DEFAULT_BACKGROUND_OPACITY = '255';
const DEFAULT_TEXT_COLOR = '#ffffff';
const DEFAULT_TIMER_FINISHED_TEXT_COLOR = '#ff0000';
const DEFAULT_CLOCK_COLOR = '#ffffff';
const DEFAULT_CLOCK_TEXT_COLOR = '#ffffff';

const DEFAULT_PRESETS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

const DEFAULT_WEBSERVER_ENABLED = true;
const DEFAULT_WEBSERVER_PORT = 6565;

const DEFAULT_NDI_ENABLED = false;
const DEFAULT_NDI_ALPHA = false;

const DEFAULT_STOP_TIMER_AT_ZERO = false;
const DEFAULT_SHOW_HOURS = false;
const DEFAULT_PULSE_AT_ZERO = false;
const DEFAULT_BLACK_AT_RESET = false;
const DEFAULT_TIMER_ALWAYS_ON_TOP = false;
const DEFAULT_SET_WINDOW_ALWAYS_ON_TOP = false;
const DEFAULT_YELLOW_AT_OPTION = 'minutes';
const DEFAULT_YELLOW_AT_MINUTES = 2;
const DEFAULT_YELLOW_AT_PERCENT = 10;

const DEFAULT_FONT = 'digital-7';

const DEFAULT_AUDIO_ENABLED = false;

const DEFAULT_SHOW_SECTIONS: ShowSections = {
  timer: true,
  progress: true,
  clock: true,
  secondsOnClock: false,
};

const DEFAULT_WINDOW_BOUNDS: WindowBounds = {
  fullscreenOn: null,
  x: 100,
  y: 100,
  width: 1280,
  height: 720
}

const DEFAULT_STORE: CountdownConfiguration = {
  defaults: {
    settings: {
      backgroundColor: DEFAULT_BACKGROUND_COLOR,
      backgroundColorOpacity: DEFAULT_BACKGROUND_OPACITY,
      textColor: DEFAULT_TEXT_COLOR,
      timerFinishedTextColor: DEFAULT_TIMER_FINISHED_TEXT_COLOR,
      clockColor: DEFAULT_CLOCK_COLOR,
      clockTextColor: DEFAULT_CLOCK_TEXT_COLOR,
      presets: DEFAULT_PRESETS,
      stopTimerAtZero: DEFAULT_STOP_TIMER_AT_ZERO,
      blackAtReset: DEFAULT_BLACK_AT_RESET,
      showHours: DEFAULT_SHOW_HOURS,
      pulseAtZero: DEFAULT_PULSE_AT_ZERO,
      webServerEnabled: DEFAULT_WEBSERVER_ENABLED,
      webServerPort: DEFAULT_WEBSERVER_PORT,
      ndiEnabled: DEFAULT_NDI_ENABLED,
      ndiAlpha: DEFAULT_NDI_ALPHA,
      show: DEFAULT_SHOW_SECTIONS,
      font: DEFAULT_FONT,
      timerAlwaysOnTop: DEFAULT_TIMER_ALWAYS_ON_TOP,
      setWindowAlwaysOnTop: DEFAULT_SET_WINDOW_ALWAYS_ON_TOP,
      yellowAtOption: DEFAULT_YELLOW_AT_OPTION,
      yellowAtMinutes: DEFAULT_YELLOW_AT_MINUTES,
      yellowAtPercent: DEFAULT_YELLOW_AT_PERCENT,
      audioEnabled: DEFAULT_AUDIO_ENABLED,
    },
    window: DEFAULT_WINDOW_BOUNDS,
  }
}

export {
  DEFAULT_STORE,
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_BACKGROUND_OPACITY,
  DEFAULT_TEXT_COLOR,
  DEFAULT_TIMER_FINISHED_TEXT_COLOR,
  DEFAULT_CLOCK_COLOR,
  DEFAULT_CLOCK_TEXT_COLOR,
  DEFAULT_WEBSERVER_ENABLED,
  DEFAULT_WEBSERVER_PORT,
  DEFAULT_NDI_ENABLED,
  DEFAULT_NDI_ALPHA,
  DEFAULT_PRESETS,
  DEFAULT_STOP_TIMER_AT_ZERO,
  DEFAULT_PULSE_AT_ZERO,
  DEFAULT_SHOW_HOURS,
  DEFAULT_WINDOW_BOUNDS,
  DEFAULT_SHOW_SECTIONS,
  DEFAULT_BLACK_AT_RESET,
  DEFAULT_FONT,
  DEFAULT_TIMER_ALWAYS_ON_TOP,
  DEFAULT_SET_WINDOW_ALWAYS_ON_TOP,
  DEFAULT_YELLOW_AT_PERCENT,
  DEFAULT_YELLOW_AT_OPTION,
  DEFAULT_YELLOW_AT_MINUTES,
  DEFAULT_AUDIO_ENABLED,
};

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

export interface CountdownConfiguration {
  defaults: {
    settings: {
      backgroundColor: string
      backgroundColorOpacity: string,
      textColor: string,
      timerFinishedTextColor: string,
      clockColor: string,
      clockTextColor: string,
      presets: number[],
      stopTimerAtZero: boolean,
      blackAtReset: boolean,
      showHours: boolean,
      pulseAtZero: boolean,
      webServerEnabled: boolean,
      webServerPort: number,
      ndiEnabled: boolean,
      ndiAlpha: boolean,
      show: ShowSections,
      font: string,
      timerAlwaysOnTop: boolean,
      setWindowAlwaysOnTop: boolean,
      yellowAtOption: string,
      yellowAtMinutes: number,
      yellowAtPercent: number,
      audioEnabled: boolean,
    },
    window: WindowBounds,
  }
}
