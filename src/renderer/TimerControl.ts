const { api } = window;
import type {ITimerController} from "../common/TimerController.ts";
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

export class TimerControl implements ITimerController {

  async set(timerId: string, seconds: number) {
    const command: IpcSetSeconds = {
      name: IpcTimerCommandName.SetSeconds,
      timerId,
      seconds,
    };
    await api.command(command);
  }

  async start(timerId: string) {
    const command: IpcStart = {
      name: IpcTimerCommandName.Start,
      timerId,
    };
    await api.command(command);
  }

  async reset(timerId: string) {
    const command: IpcReset = {
      name: IpcTimerCommandName.Reset,
      timerId,
    };
    await api.command(command);
  }

  async toggle(timerId: string) {
    const command: IpcTogglePause = {
      name: IpcTimerCommandName.TogglePause,
      timerId,
    };
    await api.command(command);
  }

  async pause(timerId: string) {
    const command: IpcPause = {
      name: IpcTimerCommandName.Pause,
      timerId,
    };
    await api.command(command);
  }

  async resume(timerId: string) {
    const command: IpcResume = {
      name: IpcTimerCommandName.Resume,
      timerId,
    };
    await api.command(command);
  }

  async jogSet(timerId: string, seconds: number) {
    const command: IpcJogSet = {
      name: IpcTimerCommandName.JogSet,
      timerId,
      seconds,
    }
    await api.command(command);
  }

  async jogCurrent(timerId: string, seconds: number) {
    const command: IpcJogCurrent = {
      name: IpcTimerCommandName.JogCurrent,
      timerId,
      seconds,
    };
    await api.command(command);
  }

  async sendMessage(timerId: string, message: string) {
    const command: IpcMessage = {
      name: IpcTimerCommandName.Message,
      timerId,
      message,
    };
    await api.command(command);
  }
}
