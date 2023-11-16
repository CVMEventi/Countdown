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
  seconds: number
}

export interface IpcStart {
  name: IpcTimerCommandName.Start
}

export interface IpcReset {
  name: IpcTimerCommandName.Reset
}

export interface IpcTogglePause {
  name: IpcTimerCommandName.TogglePause
}

export interface IpcPause {
  name: IpcTimerCommandName.Pause
}

export interface IpcResume {
  name: IpcTimerCommandName.Resume
}

export interface IpcJogSet {
  name: IpcTimerCommandName.JogSet
  seconds: number
}

export interface IpcJogCurrent {
  name: IpcTimerCommandName.JogCurrent
  seconds: number
}

export interface IpcMessage {
  name: IpcTimerCommandName.Message
  message?: string
}

export type IpcTimerCommand = IpcSetSeconds | IpcStart | IpcReset | IpcTogglePause | IpcPause | IpcResume | IpcJogSet | IpcJogCurrent | IpcMessage;
