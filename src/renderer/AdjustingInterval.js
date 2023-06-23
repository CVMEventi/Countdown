// https://stackoverflow.com/questions/29971898/how-to-create-an-accurate-timer-in-javascript

export default class AdjustingInterval {
  interval = 1000;
  timeout = null;
  expected = 0;

  constructor(callback, interval) {
    this.callback = callback;
    this.interval = interval;
  }

  start() {
    this.expected = Date.now() + this.interval;
    this.timeout = setTimeout(this.step.bind(this), this.interval);
  }

  stop() {
    clearTimeout(this.timeout);
    this.timeout = null;
  }

  isRunning() {
    return !!this.timeout;
  }

  step() {
    const drift = Date.now() - this.expected;
    if (drift > this.interval) {
      this.stop();
    }
    this.callback();
    this.expected += this.interval;
    this.timeout = setTimeout(this.step.bind(this), Math.max(0, this.interval - drift));
  }
}
