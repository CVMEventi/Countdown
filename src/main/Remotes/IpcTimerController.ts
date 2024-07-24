import {ipcMain} from "electron";
import {IpcTimerCommand, IpcTimerCommandName} from "../../common/IpcInterfaces.ts";
import IpcMainInvokeEvent = Electron.IpcMainInvokeEvent;
import {TimersOrchestrator} from "../Utilities/TimersOrchestrator.ts";


export class IpcTimerController {
  timersOrchestrator: TimersOrchestrator;

  constructor(timersOrchestrator: TimersOrchestrator) {
    this.timersOrchestrator = timersOrchestrator;
    ipcMain.handle('command', this._invokeCommand.bind(this));
  }

  private _invokeCommand(event: IpcMainInvokeEvent, command: IpcTimerCommand) {
    const timerEngine = this.timersOrchestrator.timers[command.timerId].engine

    switch (command.name) {
      case IpcTimerCommandName.SetSeconds:
        timerEngine.set(command.seconds);
        break;
      case IpcTimerCommandName.Start:
        timerEngine.start();
        break;
      case IpcTimerCommandName.Reset:
        timerEngine.reset();
        break;
      case IpcTimerCommandName.TogglePause:
        timerEngine.toggleTimer();
        break;
      case IpcTimerCommandName.Pause:
        if (!timerEngine.timerIsRunning) return;
        timerEngine.toggleTimer();
        break;
      case IpcTimerCommandName.Resume:
        if (timerEngine.timerIsRunning) return;
        timerEngine.toggleTimer();
        break;
      case IpcTimerCommandName.JogSet:
        timerEngine.jogSet(command.seconds);
        break;
      case  IpcTimerCommandName.JogCurrent:
        timerEngine.jogCurrent(command.seconds);
        break;
      case IpcTimerCommandName.Message:
        timerEngine.setMessage(command.message);
        break;
    }
  }
}
