import {ArgumentType, Server} from "node-osc";
import {TimersOrchestrator} from "../Utilities/TimersOrchestrator.ts";

const secondsPerMinute = 60;
const secondsPerHour = secondsPerMinute * 60;

export class OSC {
  isRunning = false;
  oscServer: Server = null;
  port: number = null;
  timersOrchestrator: TimersOrchestrator = null
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
    const timerId = args[0] as string
    const hours = +args[1]
    const minutes = +args[2]
    const seconds = +args[3]

    switch (messageType) {
      case '/start':
        if (args.length === 3) {
          this.timersOrchestrator.timers[timerId].engine.set(hours * secondsPerHour + minutes * secondsPerMinute + seconds);
          this.timersOrchestrator.timers[timerId].engine.start();
        } else {
          this.timersOrchestrator.timers[timerId].engine.start();
        }
        break;
      case '/set':
        this.timersOrchestrator.timers[timerId].engine.set(hours * secondsPerHour + minutes * secondsPerMinute + seconds);
        break;
      case '/toggle-pause':
        this.timersOrchestrator.timers[timerId].engine.toggleTimer();
        break;
      case '/pause':
        this.timersOrchestrator.timers[timerId].engine.pause();
        break;
      case '/resume':
        this.timersOrchestrator.timers[timerId].engine.resume();
        break;
      case '/reset':
        this.timersOrchestrator.timers[timerId].engine.reset();
        break;
      case '/jog-set':
        this.timersOrchestrator.timers[timerId].engine.jogSet(hours * secondsPerHour + minutes * secondsPerMinute + seconds);
        break;
      case '/jog-current':
        this.timersOrchestrator.timers[timerId].engine.jogCurrent(hours * secondsPerHour + minutes * secondsPerMinute + seconds);
        break;
    }
  }
}
