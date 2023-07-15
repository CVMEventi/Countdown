import AdjustingInterval from "./AdjustingInterval";
import {DEFAULT_TIMER_DURATION} from "../../common/config";

export class Timer {
  interval: number;
  adjustingTimer: AdjustingInterval;
  secondsSet = 0;
  seconds = 0;
  stopsAtZero = false;
  timerTickCallback: (seconds: number) => void = null;
  timerStatusChangeCallback: (status: string) => void = null;

  constructor(interval: number = DEFAULT_TIMER_DURATION, timerTickCallback: (seconds: number) => void, timerStatusChangeCallback: (status: string) => void) {
    this.interval = interval;
    this.adjustingTimer = new AdjustingInterval(this._timerTick.bind(this), this.interval);
    this.timerTickCallback = timerTickCallback;
    this.timerStatusChangeCallback = timerStatusChangeCallback;
  }

  isRunning() {
    return this.adjustingTimer.isRunning();
  }

  setInterval(interval: number) {
    this.interval = interval;
    this.adjustingTimer.interval = interval;
  }

  start(seconds: number, stopsAtZero: boolean) {
    if (this.isRunning()) {
      this.pause();
    }

    this.secondsSet = seconds;
    this.seconds = seconds;
    this.stopsAtZero = stopsAtZero;

    this.timerTickCallback(this.seconds);

    this.resume();
  }

  resume() {
    if (this.isRunning()) return;
    this.adjustingTimer.start();
    this.timerStatusChangeCallback('started');
  }

  pause() {
    if (!this.isRunning()) return;
    this.adjustingTimer.stop();
    this.timerStatusChangeCallback('stopped');
  }

  toggle() {
    if (this.isRunning()) {
      this.pause();
    } else {
      this.resume();
    }
  }

  reset() {
    this.pause();
    this.seconds = 0;
    this.secondsSet = 0;
    this.timerStatusChangeCallback('reset');
    this.timerTickCallback(0);
  }

  add(seconds: number) {
    this.seconds += seconds;
    this.timerTickCallback(this.seconds);
  }

  sub(seconds: number) {
    this.seconds -= seconds;
    this.timerTickCallback(this.seconds);
  }

  _timerTick() {
    this.seconds = this.seconds - 1;
    this.timerTickCallback(this.seconds);

    if (this.seconds <= 0 && this.stopsAtZero) {
      this.seconds = 0;
      this.timerTickCallback(0);
      this.pause();
    }
  }
}
