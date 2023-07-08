import {ipcRenderer} from "electron";
import {TimerEngineUpdate} from "../common/TimerInterfaces";
import {
  IpcJogCurrent,
  IpcJogSet,
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
    let command: IpcSetSeconds = {
      name: IpcTimerCommandName.SetSeconds,
      seconds,
    };
    await ipcRenderer.invoke('command', command);
  }

  async start() {
    let command: IpcStart = {
      name: IpcTimerCommandName.Start,
    };
    await ipcRenderer.invoke('command', command);
  }

  async reset() {
    let command: IpcReset = {
      name: IpcTimerCommandName.Reset,
    };
    await ipcRenderer.invoke('command', command);
  }

  async toggle() {
    let command: IpcTogglePause = {
      name: IpcTimerCommandName.TogglePause,
    };
    await ipcRenderer.invoke('command', command);
  }

  async pause() {
    let command: IpcPause = {
      name: IpcTimerCommandName.Pause,
    };
    await ipcRenderer.invoke('command', command);
  }

  async resume() {
    let command: IpcResume = {
      name: IpcTimerCommandName.Resume,
    };
    await ipcRenderer.invoke('command', command);
  }

  async jogSet(seconds: number) {
    let command: IpcJogSet = {
      name: IpcTimerCommandName.JogSet,
      seconds,
    }
    await ipcRenderer.invoke('command', command);
  }

  async jogCurrent(seconds: number) {
    let command: IpcJogCurrent = {
      name: IpcTimerCommandName.JogCurrent,
      seconds,
    };
    await ipcRenderer.invoke('command', command);
  }
}
