export interface TimerEngineUpdate {
  setSeconds: number
  secondsSetOnCurrentTimer: number
  currentSeconds: number
  countSeconds: number
  extraSeconds: number
  isExpiring: boolean
  isRunning: boolean
  isReset: boolean
  isCountingUp: boolean
  timerEndsAt: string
}

export interface TimerEngineUpdates {
  [key: string]: TimerEngineUpdate
}

export interface MessageUpdate {
  timerId: string
  message?: string
}

export interface WebSocketUpdate<PayloadType> {
  type: string
  update: PayloadType
}

export interface TimerEngineWebSocketUpdate {
  timerId?: string,
  state: string
  setTime: number,
  setTimeHms: string,
  setTimeMs: string,
  setTimeH: string,
  setTimeM: string,
  setTimeS: string,
  currentTimeHms?: string
  currentTimeMs?: string
  currentTimeH?: string
  currentTimeM?: string
  currentTimeS?: string
  currentTime?: number
  timeSetOnCurrentTimer?: number
  timeSetOnCurrentTimerHms?: string
  timeSetOnCurrentTimerMs?: string
  timeSetOnCurrentTimerH?: string
  timeSetOnCurrentTimerM?: string
  timeSetOnCurrentTimerS?: string
  timerEndsAt?: string
}

export type UpdateCallback = (update: TimerEngineUpdate) => void;
export type WebSocketUpdateCallback = (update: TimerEngineWebSocketUpdate) => void;
export type MessageUpdateCallback = (update: MessageUpdate) => void;
export type PlaySoundCallback = (audioFilePath: string) => void;
