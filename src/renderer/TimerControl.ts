import {ipcRenderer} from "electron";
import {TimerEngineUpdate} from "../common/TimerInterfaces.ts";
import {
  IpcJogCurrent,
  IpcJogSet,
  IpcMessage,
  IpcPause,
  IpcReset,
  IpcResume,
  IpcSetSeconds,
  IpcStart,
  IpcTimerCommandName,
  IpcTogglePause
} from "../common/IpcInterfaces.ts";

export class TimerControl {

  async set(timerId: string, seconds: number) {
    const command: IpcSetSeconds = {
      name: IpcTimerCommandName.SetSeconds,
      timerId,
      seconds,
    };
    await ipcRenderer.invoke('command', command);
  }

  async start(timerId: string) {
    const command: IpcStart = {
      name: IpcTimerCommandName.Start,
      timerId,
    };
    await ipcRenderer.invoke('command', command);
  }

  async reset(timerId: string) {
    const command: IpcReset = {
      name: IpcTimerCommandName.Reset,
      timerId,
    };
    await ipcRenderer.invoke('command', command);
  }

  async toggle(timerId: string) {
    const command: IpcTogglePause = {
      name: IpcTimerCommandName.TogglePause,
      timerId,
    };
    await ipcRenderer.invoke('command', command);
  }

  async pause(timerId: string) {
    const command: IpcPause = {
      name: IpcTimerCommandName.Pause,
      timerId,
    };
    await ipcRenderer.invoke('command', command);
  }

  async resume(timerId: string) {
    const command: IpcResume = {
      name: IpcTimerCommandName.Resume,
      timerId,
    };
    await ipcRenderer.invoke('command', command);
  }

  async jogSet(timerId: string, seconds: number) {
    const command: IpcJogSet = {
      name: IpcTimerCommandName.JogSet,
      timerId,
      seconds,
    }
    await ipcRenderer.invoke('command', command);
  }

  async jogCurrent(timerId: string, seconds: number) {
    const command: IpcJogCurrent = {
      name: IpcTimerCommandName.JogCurrent,
      timerId,
      seconds,
    };
    await ipcRenderer.invoke('command', command);
  }

  async sendMessage(timerId: string, message: string) {
    const command: IpcMessage = {
      name: IpcTimerCommandName.Message,
      timerId,
      message,
    };
    await ipcRenderer.invoke('command', command);
  }
}
