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
    const command: IpcSetSeconds = {
      name: IpcTimerCommandName.SetSeconds,
      seconds,
    };
    await ipcRenderer.invoke('command', command);
  }

  async start() {
    const command: IpcStart = {
      name: IpcTimerCommandName.Start,
    };
    await ipcRenderer.invoke('command', command);
  }

  async reset() {
    const command: IpcReset = {
      name: IpcTimerCommandName.Reset,
    };
    await ipcRenderer.invoke('command', command);
  }

  async toggle() {
    const command: IpcTogglePause = {
      name: IpcTimerCommandName.TogglePause,
    };
    await ipcRenderer.invoke('command', command);
  }

  async pause() {
    const command: IpcPause = {
      name: IpcTimerCommandName.Pause,
    };
    await ipcRenderer.invoke('command', command);
  }

  async resume() {
    const command: IpcResume = {
      name: IpcTimerCommandName.Resume,
    };
    await ipcRenderer.invoke('command', command);
  }

  async jogSet(seconds: number) {
    const command: IpcJogSet = {
      name: IpcTimerCommandName.JogSet,
      seconds,
    }
    await ipcRenderer.invoke('command', command);
  }

  async jogCurrent(seconds: number) {
    const command: IpcJogCurrent = {
      name: IpcTimerCommandName.JogCurrent,
      seconds,
    };
    await ipcRenderer.invoke('command', command);
  }
}
