// Counts elapsed "ticks" (timer seconds, each lasting `interval` ms) by measuring a monotonic clock
// instead of counting timeout callbacks, so late or throttled callbacks never accumulate error.
// Timeouts are only used to decide when to look at the clock again.

const EARLY_WAKE_MS = 3;

export default class PreciseClock {
  callback: (ticks: number) => void;
  now: () => number;

  private _interval: number;
  private _accumulatedTicks = 0; // fractional ticks from completed running segments
  private _anchor: number | null = null; // start of the current running segment, null when stopped
  private _lastTicks = 0;
  private _timeout: NodeJS.Timeout | null = null;
  private _immediate: NodeJS.Immediate | null = null;

  constructor(callback: (ticks: number) => void, interval: number, now: () => number = () => performance.now()) {
    this.callback = callback;
    this._interval = interval;
    this.now = now;
  }

  get interval() {
    return this._interval;
  }

  isRunning() {
    return this._anchor !== null;
  }

  elapsedTicks() {
    if (this._anchor === null) return this._accumulatedTicks;
    return this._accumulatedTicks + (this.now() - this._anchor) / this._interval;
  }

  ticks() {
    return Math.floor(this.elapsedTicks());
  }

  start() {
    if (this.isRunning()) return;
    this._anchor = this.now();
    this._schedule();
  }

  stop() {
    if (!this.isRunning()) return;
    this._foldSegment();
    this._anchor = null;
    this._clearScheduled();
  }

  reset() {
    this._accumulatedTicks = 0;
    this._lastTicks = 0;
    if (this.isRunning()) {
      this._anchor = this.now();
      this._schedule();
    }
  }

  setInterval(interval: number) {
    if (interval === this._interval) return;
    // Close the current segment at the old rate so the change applies only from now on
    this._foldSegment();
    this._interval = interval;
    if (this.isRunning()) this._step();
  }

  // Adds time the monotonic clock did not see (e.g. system sleep)
  advance(ms: number) {
    if (!this.isRunning() || ms <= 0) return;
    this._accumulatedTicks += ms / this._interval;
    this._step();
  }

  private _foldSegment() {
    if (this._anchor === null) return;
    const now = this.now();
    this._accumulatedTicks += (now - this._anchor) / this._interval;
    this._anchor = now;
  }

  private _clearScheduled() {
    if (this._timeout) clearTimeout(this._timeout);
    if (this._immediate) clearImmediate(this._immediate);
    this._timeout = null;
    this._immediate = null;
  }

  private _step() {
    this._clearScheduled();

    const ticks = this.ticks();
    if (ticks !== this._lastTicks) {
      this._lastTicks = ticks;
      this.callback(ticks);
      // The callback may have stopped or rescheduled the clock
      if (!this.isRunning() || this._timeout || this._immediate) return;
    }

    this._schedule();
  }

  private _schedule(lastNow?: number) {
    this._clearScheduled();

    const now = this.now();
    const remainingMs = (this._lastTicks + 1 - this.elapsedTicks()) * this._interval;

    if (remainingMs <= 0) {
      this._step();
    } else if (remainingMs > EARLY_WAKE_MS) {
      this._timeout = setTimeout(() => this._schedule(), remainingMs - EARLY_WAKE_MS);
    } else if (lastNow === now) {
      // The clock did not move since the last spin (coarse or frozen clock): wait instead of spinning
      this._timeout = setTimeout(() => this._schedule(), Math.ceil(remainingMs));
    } else {
      // Close to the boundary: spin on the event loop so the tick lands on time instead of ~1-4ms late
      this._immediate = setImmediate(() => this._schedule(now));
    }
  }
}
