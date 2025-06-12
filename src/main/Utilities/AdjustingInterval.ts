// https://stackoverflow.com/questions/29971898/how-to-create-an-accurate-timer-in-javascript

export default class AdjustingInterval {
  interval = 1000;
  callback: () => void = null;
  _timeout: NodeJS.Timeout = null;
  _startingTime = Date.now();
  _drifts: number[] = [];
  _lastActualInterval = 1000;

  constructor(callback: () => void, interval: number) {
    this.callback = callback;
    this.interval = interval;
  }

  start() {
    this._startingTime = Date.now();
    this._lastActualInterval = this.interval;
    this._timeout = setTimeout(this.step.bind(this), this._lastActualInterval);
  }

  stop() {
    clearTimeout(this._timeout);
    this._timeout = null;
  }

  isRunning() {
    return !!this._timeout;
  }

  step() {
    const elapsedTime = Date.now() - this._startingTime;
    const drift = elapsedTime - this._lastActualInterval;
    if (drift > this.interval) {
      this.stop();
    }
    this.callback();

    this._drifts = this._drifts.slice(-59).concat(drift);
    const avgDrift = Math.round(this._drifts.reduce((partialSum, drift) => partialSum + drift, 0) / this._drifts.length);
    this._startingTime += elapsedTime // to include the processing time between one second and another
    this._lastActualInterval = Math.max(0, this.interval - avgDrift);
    this._timeout = setTimeout(this.step.bind(this), Math.max(0, this._lastActualInterval));
  }
}
