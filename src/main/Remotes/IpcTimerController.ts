import {ipcMain} from "electron";
import {TimerEngine} from "../TimerEngine";
import {IpcTimerCommand, IpcTimerCommandName} from "../../common/IpcInterfaces";
import IpcMainInvokeEvent = Electron.IpcMainInvokeEvent;


export class IpcTimerController {
  timerEngine: TimerEngine;

  constructor(timerEngine: TimerEngine) {
    this.timerEngine = timerEngine;
    ipcMain.handle('command', this._invokeCommand.bind(this));
  }

  private _invokeCommand(event: IpcMainInvokeEvent, command: IpcTimerCommand) {
    switch (command.name) {
      case IpcTimerCommandName.SetSeconds:
        this.timerEngine.set(command.seconds);
        break;
      case IpcTimerCommandName.Start:
        this.timerEngine.start();
        break;
      case IpcTimerCommandName.Reset:
        this.timerEngine.reset();
        break;
      case IpcTimerCommandName.TogglePause:
        this.timerEngine.toggleTimer();
        break;
      case IpcTimerCommandName.Pause:
        if (!this.timerEngine.timerIsRunning) return;
        this.timerEngine.toggleTimer();
        break;
      case IpcTimerCommandName.Resume:
        if (this.timerEngine.timerIsRunning) return;
        this.timerEngine.toggleTimer();
        break;
      case IpcTimerCommandName.JogSet:
        this.timerEngine.jogSet(command.seconds);
        break;
      case  IpcTimerCommandName.JogCurrent:
        this.timerEngine.jogCurrent(command.seconds);
        break;
      case IpcTimerCommandName.Message:
        this.timerEngine.setMessage(command.message);
        break;
    }
  }
}
