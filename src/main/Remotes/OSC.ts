import {ArgumentType, Server} from "node-osc"; // eslint-disable-line import/no-unresolved
import {TimerEngine} from "../TimerEngine";
import {TimersOrchestrator} from "../Utilities/TimersOrchestrator";
import * as timers from "node:timers";

const secondsPerMinute = 60;
const secondsPerHour = secondsPerMinute * 60;

export class OSC {
  isRunning = false;
  oscServer: Server = null;
  port: number = null;
  timersOrchestrator: TimersOrchestrator = null;
  constructor(port: number, timersOrchestrator: TimersOrchestrator) {
    this.port = port;
    this.timersOrchestrator = timersOrchestrator;
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
    console.log(message)
    const [messageType, ...args] = message;
    const hours = +args[0];
    const minutes = +args[1];
    const seconds = +args[2];

    switch (messageType) {
      case '/start':
        if (args.length === 3) {


          this.timersOrchestrator.timers[0].engine.set(hours * secondsPerHour + minutes * secondsPerMinute + seconds);
          this.timersOrchestrator.timers[0].engine.start();
        } else {
          this.timersOrchestrator.timers[0].engine.start();
        }
        break;
      case '/set':
        this.timersOrchestrator.timers[0].engine.set(hours * secondsPerHour + minutes * secondsPerMinute + seconds);
        break;
      case '/toggle-pause':
        this.timersOrchestrator.timers[0].engine.toggleTimer();
        break;
      case '/pause':
        this.timersOrchestrator.timers[0].engine.pause();
        break;
      case '/resume':
        this.timersOrchestrator.timers[0].engine.resume();
        break;
      case '/reset':
        this.timersOrchestrator.timers[0].engine.reset();
        break;
      case '/jog-set':
        this.timersOrchestrator.timers[0].engine.jogSet(hours * secondsPerHour + minutes * secondsPerMinute + seconds);
        break;
      case '/jog-current':
        this.timersOrchestrator.timers[0].engine.jogCurrent(hours * secondsPerHour + minutes * secondsPerMinute + seconds);
        break;
    }
  }
}
