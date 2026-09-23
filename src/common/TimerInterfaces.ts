import type {Timers} from "./config.ts";
import type {PlaybackMedia} from "./playback.ts";

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
  timerEndsAt: string | null
  timerEndsAtEpochMs?: number | null
  // Set while a playback source is painted over this timer: the name of the source driving it
  source?: string | null
  sourceTitle?: string | null
  sourceMedia?: PlaybackMedia | null
  // The timer's OWN clock, which keeps running underneath an override. Without these the
  // operator loses sight of their own countdown the moment a playback source takes the display.
  timerIsReset?: boolean
  timerCurrentSeconds?: number
  timerIsRunning?: boolean
  // When the timer's own clock runs out. `timerEndsAt` above is the DISPLAYED one, which a
  // playback source takes over; this one always belongs to the timer itself.
  ownEndsAt?: string | null
}

export interface TimerEngineUpdates {
  [key: string]: TimerEngineUpdate
}

export interface MessageUpdate {
  timerId: string
  message?: string
}

export type MessageWebSocketUpdate = MessageUpdate

export interface AudioWebSocketUpdate {
  timerId: string
}

export interface AudioStateWebSocketUpdate {
  playingTimerIds: string[]
}

export interface WebSocketUpdate<PayloadType> {
  type: string
  update: PayloadType
}

export type ConfigWebSocketUpdate = Timers

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
  timerEndsAtEpochMs?: number | null
  source?: string | null
  sourceTitle?: string | null
  sourceMedia?: PlaybackMedia | null
  // The timer's OWN clock, which keeps running underneath an override
  timerState?: string
  timerCurrentTime?: number
  ownEndsAt?: string
}

/**
 * The whole of the state a client needs on connect, in one frame. Sent before any tick update so
 * a client never has to render a half known timer.
 */
export interface TimerSnapshot {
  timers: Timers
  timerEngine: { [timerId: string]: TimerEngineWebSocketUpdate }
  messages: { [timerId: string]: string | null }
  playingTimerIds: string[]
}

export type AnyWebSocketUpdate =
  | WebSocketUpdate<TimerEngineWebSocketUpdate>
  | WebSocketUpdate<ConfigWebSocketUpdate>
  | WebSocketUpdate<MessageWebSocketUpdate>
  | WebSocketUpdate<AudioWebSocketUpdate>
  | WebSocketUpdate<AudioStateWebSocketUpdate>
  | WebSocketUpdate<TimerSnapshot>

export type UpdateCallback = (update: TimerEngineUpdate) => void;
export type WebSocketUpdateCallback = (update: TimerEngineWebSocketUpdate) => void;
export type MessageUpdateCallback = (update: MessageUpdate) => void;
export type PlaySoundCallback = (audioFilePath: string) => void;
