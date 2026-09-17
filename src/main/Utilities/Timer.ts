import PreciseClock from "./PreciseClock.ts";
import {DEFAULT_TIMER_DURATION} from "../../common/config.ts";

export class Timer {
  clock: PreciseClock;
  secondsSet = 0;
  offset = 0; // manual adjustments (add/sub/clamping) applied on top of secondsSet
  stopsAtZero = false;
  timerTickCallback: (seconds: number) => void = null;
  timerStatusChangeCallback: (status: string) => void = null;

  constructor(interval: number = DEFAULT_TIMER_DURATION, timerTickCallback: (seconds: number) => void, timerStatusChangeCallback: (status: string) => void) {
    this.clock = new PreciseClock(this._timerTick.bind(this), interval);
    this.timerTickCallback = timerTickCallback;
    this.timerStatusChangeCallback = timerStatusChangeCallback;
  }

  get interval() {
    return this.clock.interval;
  }

  get seconds() {
    return this.secondsSet + this.offset - this.clock.ticks();
  }

  isRunning() {
    return this.clock.isRunning();
  }

  setInterval(interval: number) {
    this.clock.setInterval(interval);
  }

  start(seconds: number, stopsAtZero: boolean) {
    if (this.isRunning()) {
      this.pause();
    }

    this.clock.reset();
    this.secondsSet = seconds;
    this.offset = 0;
    this.stopsAtZero = stopsAtZero;

    this.timerTickCallback(this.seconds);

    this.resume();
  }

  resume() {
    if (this.isRunning()) return;
    this.clock.start();
    this.timerStatusChangeCallback('started');
  }

  pause() {
    if (!this.isRunning()) return;
    this.clock.stop();
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
    this.clock.reset();
    this.offset = 0;
    this.secondsSet = 0;
    this.timerStatusChangeCallback('reset');
    this.timerTickCallback(0);
  }

  add(seconds: number) {
    this.offset += seconds;
    this.timerTickCallback(this.seconds);
  }

  sub(seconds: number) {
    this.offset -= seconds;
    this.timerTickCallback(this.seconds);
  }

  // Adds time the monotonic clock did not see (e.g. system sleep)
  advance(ms: number) {
    this.clock.advance(ms);
  }

  _timerTick() {
    if (this.seconds <= 0 && this.stopsAtZero) {
      this.pause();
      this.offset -= this.seconds;
    }

    this.timerTickCallback(this.seconds);
  }
}
