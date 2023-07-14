import {ArgumentType, Server} from "node-osc";
import {BrowserWindow} from "electron";
import {TimerControl} from "../../renderer/TimerControl";
import {TimerEngine} from "../TimerEngine";

const secondsPerMinute = 60;
const secondsPerHour = secondsPerMinute * 60;

export class OSC {
  isRunning: boolean = false;
  oscServer: Server = null;
  port: number = null;
  timerEngine: TimerEngine = null;
  constructor(port: number, timerEngine: TimerEngine) {
    this.port = port;
    this.timerEngine = timerEngine;
  }

  start() {
    if (this.isRunning) return;
    this.oscServer = new Server(this.port, '0.0.0.0', () => {
      this.isRunning = true;
    })

    this.oscServer.on('message', this._messageReceived.bind(this));
  }

  stop() {
    if (!this.isRunning) return;
    this.oscServer.close();
    this.isRunning = false;
  }

  _messageReceived(message: [string, ...ArgumentType[]]) {
    const [messageType, ...args] = message;
    const hours = +args[0];
    const minutes = +args[1];
    const seconds = +args[2];
    switch (messageType) {
      case '/start':
        if (args.length === 3) {


          this.timerEngine.set(hours * secondsPerHour + minutes * secondsPerMinute + seconds);
          this.timerEngine.start();
        } else {
          this.timerEngine.start();
        }
        break;
      case '/set':
        this.timerEngine.set(hours * secondsPerHour + minutes * secondsPerMinute + seconds);
        break;
      case '/toggle-pause':
        this.timerEngine.toggleTimer();
        break;
      case '/pause':
        this.timerEngine.pause();
        break;
      case '/resume':
        this.timerEngine.resume();
        break;
      case '/reset':
        this.timerEngine.reset();
        break;
      case '/jog-set':
        this.timerEngine.jogSet(hours * secondsPerHour + minutes * secondsPerMinute + seconds);
        break;
      case '/jog-current':
        this.timerEngine.jogCurrent(hours * secondsPerHour + minutes * secondsPerMinute + seconds);
        break;
    }
  }
}
