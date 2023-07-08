// https://stackoverflow.com/questions/29971898/how-to-create-an-accurate-timer-in-javascript

export default class AdjustingInterval {
  interval: number = 1000;
  callback: () => void = null;
  _timeout: NodeJS.Timeout = null;
  _expected: number = 0;

  constructor(callback: () => void, interval: number) {
    this.callback = callback;
    this.interval = interval;
  }

  start() {
    this._expected = Date.now() + this.interval;
    this._timeout = setTimeout(this.step.bind(this), this.interval);
  }

  stop() {
    clearTimeout(this._timeout);
    this._timeout = null;
  }

  isRunning() {
    return !!this._timeout;
  }

  step() {
    const drift = Date.now() - this._expected;
    if (drift > this.interval) {
      this.stop();
    }
    this.callback();
    this._expected += this.interval;
    this._timeout = setTimeout(this.step.bind(this), Math.max(0, this.interval - drift));
  }
}
