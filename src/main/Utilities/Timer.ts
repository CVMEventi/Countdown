import AdjustingInterval from "./AdjustingInterval";

export class Timer {
  interval: number = 1000;
  adjustingTimer = new AdjustingInterval(this._timerTick.bind(this), this.interval);
  secondsSet = 0;
  seconds = 0;
  stopsAtZero = false;
  timerTickCallback: (seconds: number) => void = null;
  timerStatusChangeCallback: (status: string) => void = null;

  constructor(timerTickCallback: (seconds: number) => void, timerStatusChangeCallback: (status: string) => void) {
    this.timerTickCallback = timerTickCallback;
    this.timerStatusChangeCallback = timerStatusChangeCallback;
  }

  isRunning() {
    return this.adjustingTimer.isRunning();
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
