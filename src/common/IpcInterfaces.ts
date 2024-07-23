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
}

export interface IpcSetSeconds {
  name: IpcTimerCommandName.SetSeconds
  timerId: number
  seconds: number
}

export interface IpcStart {
  name: IpcTimerCommandName.Start
  timerId: number
}

export interface IpcReset {
  name: IpcTimerCommandName.Reset
  timerId: number
}

export interface IpcTogglePause {
  name: IpcTimerCommandName.TogglePause
  timerId: number
}

export interface IpcPause {
  name: IpcTimerCommandName.Pause
  timerId: number
}

export interface IpcResume {
  name: IpcTimerCommandName.Resume
  timerId: number
}

export interface IpcJogSet {
  name: IpcTimerCommandName.JogSet
  timerId: number
  seconds: number
}

export interface IpcJogCurrent {
  name: IpcTimerCommandName.JogCurrent
  timerId: number
  seconds: number
}

export interface IpcMessage {
  name: IpcTimerCommandName.Message
  timerId: number
  message?: string
}

export type IpcTimerCommand = IpcSetSeconds | IpcStart | IpcReset | IpcTogglePause | IpcPause | IpcResume | IpcJogSet | IpcJogCurrent | IpcMessage;

export interface IpcGetWindowSettingsArgs {
  timerId: number
  windowId: number
}
