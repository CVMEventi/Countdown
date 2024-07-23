import {ipcRenderer} from "electron";
import {TimerEngineUpdate} from "../common/TimerInterfaces";
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
} from "../common/IpcInterfaces";

export class TimerControl {
  constructor(updateCallback: (update: TimerEngineUpdate) => void) {
    ipcRenderer.on('update', (event, update) => {
      updateCallback(update);
    });
  }

  async set(seconds: number) {
    const command: IpcSetSeconds = {
      name: IpcTimerCommandName.SetSeconds,
      timerId: 0,
      seconds,
    };
    await ipcRenderer.invoke('command', command);
  }

  async start() {
    const command: IpcStart = {
      name: IpcTimerCommandName.Start,
      timerId: 0,
    };
    await ipcRenderer.invoke('command', command);
  }

  async reset() {
    const command: IpcReset = {
      name: IpcTimerCommandName.Reset,
      timerId: 0,
    };
    await ipcRenderer.invoke('command', command);
  }

  async toggle() {
    const command: IpcTogglePause = {
      name: IpcTimerCommandName.TogglePause,
      timerId: 0,
    };
    await ipcRenderer.invoke('command', command);
  }

  async pause() {
    const command: IpcPause = {
      name: IpcTimerCommandName.Pause,
      timerId: 0,
    };
    await ipcRenderer.invoke('command', command);
  }

  async resume() {
    const command: IpcResume = {
      name: IpcTimerCommandName.Resume,
      timerId: 0,
    };
    await ipcRenderer.invoke('command', command);
  }

  async jogSet(seconds: number) {
    const command: IpcJogSet = {
      name: IpcTimerCommandName.JogSet,
      timerId: 0,
      seconds,
    }
    await ipcRenderer.invoke('command', command);
  }

  async jogCurrent(seconds: number) {
    const command: IpcJogCurrent = {
      name: IpcTimerCommandName.JogCurrent,
      timerId: 0,
      seconds,
    };
    await ipcRenderer.invoke('command', command);
  }

  async sendMessage(message: string) {
    const command: IpcMessage = {
      name: IpcTimerCommandName.Message,
      timerId: 0,
      message,
    };
    await ipcRenderer.invoke('command', command);
  }
}
