export enum IpcTimerCommandName {
  SetSeconds,
  Start,
  Reset,
  TogglePause,
  Pause,
  Resume,
  JogSet,
  JogCurrent,
  Message,
  StopSound,
}

export interface IpcSetSeconds {
  name: IpcTimerCommandName.SetSeconds
  timerId: string
  seconds: number
}

export interface IpcStart {
  name: IpcTimerCommandName.Start
  timerId: string
}

export interface IpcReset {
  name: IpcTimerCommandName.Reset
  timerId: string
}

export interface IpcTogglePause {
  name: IpcTimerCommandName.TogglePause
  timerId: string
}

export interface IpcPause {
  name: IpcTimerCommandName.Pause
  timerId: string
}

export interface IpcResume {
  name: IpcTimerCommandName.Resume
  timerId: string
}

export interface IpcJogSet {
  name: IpcTimerCommandName.JogSet
  timerId: string
  seconds: number
}

export interface IpcJogCurrent {
  name: IpcTimerCommandName.JogCurrent
  timerId: string
  seconds: number
}

export interface IpcMessage {
  name: IpcTimerCommandName.Message
  timerId: string
  message?: string
}

export interface IpcStopSound {
  name: IpcTimerCommandName.StopSound
  timerId: string
}

export type IpcTimerCommand = IpcSetSeconds | IpcStart | IpcReset | IpcTogglePause | IpcPause | IpcResume | IpcJogSet | IpcJogCurrent | IpcMessage | IpcStopSound;

export interface IpcGetWindowSettingsArgs {
  timerId: string
  windowId: string
}
