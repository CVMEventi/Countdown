import {Timer} from "./Utilities/Timer.ts";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";
import {
  MessageUpdateCallback,
  UpdateCallback,
  WebSocketUpdateCallback
} from "../common/TimerInterfaces.ts";
import {DEFAULT_SET_TIME_LIVE, DEFAULT_STOP_TIMER_AT_ZERO, DEFAULT_YELLOW_AT_OPTION} from "../common/config.ts";
dayjs.extend(duration);

export interface TimerEngineOptions {
  yellowAt?: number
  yellowAtOption?: string
  setTimeLive?: boolean
  stopTimerAtZero?: boolean
}

export class TimerEngine {
  private _currentSeconds = 0;
  private _secondsSetOnCurrentTimer = 0;
  private _audioRun = false;
  private _timer: Timer;

  options: TimerEngineOptions = {
    stopTimerAtZero: DEFAULT_STOP_TIMER_AT_ZERO,
    yellowAt: 0,
    yellowAtOption: DEFAULT_YELLOW_AT_OPTION,
    setTimeLive: DEFAULT_SET_TIME_LIVE,
  }
  totalSeconds = 0;
  timerIsRunning = false;
  audioEnabled = false;
  update: UpdateCallback = null;
  webSocketUpdate: WebSocketUpdateCallback = null;
  messageUpdate: MessageUpdateCallback = null;

  constructor(interval: number, options: TimerEngineOptions, update: UpdateCallback, webSocketUpdate: WebSocketUpdateCallback, messageUpdate: MessageUpdateCallback) {
    this._timer = new Timer(interval, this._timerTick.bind(this), this._timerStatusChanged.bind(this))
    this.options = {
      ...this.options,
      ...options,
    }

    this.update = update;
    this.webSocketUpdate = webSocketUpdate;
    this.messageUpdate = messageUpdate;
  }

  extraSeconds() {
    if (this._currentSeconds > 0) {
      return 0;
    }

    return Math.abs(this._currentSeconds);
  }

  countSeconds() {
    if (this._currentSeconds < 0) {
      return 0;
    }

    return this._currentSeconds;
  }

  isReset() {
    return this._timer.secondsSet === 0 && this._currentSeconds === 0;
  }

  isCountingUp() {
    return this._currentSeconds <= 0;
  }

  isExpiring() {
    if (this.isReset() || this.isCountingUp()) {
      return false;
    }

    if (this.options.yellowAtOption === 'minutes'
        && this.options.yellowAt >= this._currentSeconds / 60) {
      return true;
    }

    if (this.options.yellowAtOption === 'percent'
        && this.options.yellowAt >= this._timer.secondsSet / 100 * this._currentSeconds) {
      return true;
    }

    return false;
  }

  endsAt() {
    if (this.countSeconds() <= 0) return null;
    return dayjs().add(this._currentSeconds, 's').format('HH:mm');
  }

  setTimerInterval(interval: number) {
    this._timer.setInterval(interval);
    this._timer.adjustingTimer.interval = interval;
  }

  start() {
    this._secondsSetOnCurrentTimer = this.totalSeconds;
    this._audioRun = false;
    this._timer.start(this.totalSeconds, this.options.stopTimerAtZero);
    this._sendUpdate();
    this._sendWebSocketUpdate();
  }

  startResumePause() {
    if (this.timerIsRunning) {
      this._timer.pause();
      return;
    }

    if (!this.isReset() && !this.timerIsRunning) {
      this._timer.resume();
      return;
    }

    this.start();
  }

  toggleTimer() {
    this._timer.toggle();
    this._sendWebSocketUpdate();
    this._sendUpdate();
  }

  pause() {
    this._timer.pause();
    this._sendWebSocketUpdate();
    this._sendUpdate();
  }

  resume() {
    this._timer.resume();
    this._sendWebSocketUpdate();
    this._sendUpdate();
  }

  reset() {
    if (this._secondsSetOnCurrentTimer === 0) {
      this.totalSeconds = 0;
    }

    this._audioRun = true;
    this._timer.reset();
    this._secondsSetOnCurrentTimer = 0;

    this._sendUpdate();
    this._sendWebSocketUpdate();
  }

  set(seconds: number) {
    this.totalSeconds = seconds;
    this._sendUpdate();
    this._sendWebSocketUpdate();
  }

  jogSet(seconds: number) {
    if (this.totalSeconds <= 0 && seconds <= 0) return;
    this.set(this.totalSeconds + seconds);
  }

  jogCurrent(seconds: number) {
    if (!this._timer.isRunning()) return;
    this._timer.add(seconds);
    this._sendUpdate();
  }

  add(minutes: number) {
    if (this._timer.isRunning()) {
      this._timer.add(minutes * 60);
    } else {
      this.totalSeconds += minutes * 60;
    }

    this._sendUpdate();
  }

  sub(minutes: number) {
    if (this._timer.isRunning()) {
      this._timer.sub(minutes * 60);
    } else {
      this.totalSeconds -= minutes * 60;
    }

    this._sendUpdate();
  }

  setMessage(message?: string) {
    this.messageUpdate({
      message,
    });
  }

  _timerTick(seconds: number) {
    this._currentSeconds = seconds;
    this._sendUpdate();
    this._sendWebSocketUpdate();
  }

  private _sendUpdate() {
    let currentSeconds = this._currentSeconds;

    if (this.options.setTimeLive && this.isReset()) {
      currentSeconds = this.totalSeconds;
    }

    this.update({
      setSeconds: this.totalSeconds,
      currentSeconds: currentSeconds,
      countSeconds: this.countSeconds(),
      extraSeconds: this.extraSeconds(),
      secondsSetOnCurrentTimer: this._secondsSetOnCurrentTimer,
      isExpiring: this.isExpiring(),
      isReset: this.isReset(),
      isRunning: this.timerIsRunning,
      isCountingUp: this.isCountingUp(),
      timerEndsAt: this.endsAt(),
    })
  }

  private _sendWebSocketUpdate() {
    const isExpired = this._currentSeconds <= 0;

    let state = 'Running';
    if (this.isReset()) {
      state = 'Not Running';
    } else if (!this.timerIsRunning) {
      state = 'Paused';
    } else if (isExpired) {
      if (this.audioEnabled && !this._audioRun) {
        //sound.play();
        this._audioRun = true;
      }
      state = 'Expired';
    } else if (this.isExpiring()) {
      state = 'Expiring';
    }

    const setTimeDuration = dayjs.duration(Math.abs(this.totalSeconds), 'seconds');
    const currentTimeDuration = dayjs.duration(Math.abs(this._currentSeconds), 'seconds');
    const timeSetOnCurrentTimerDuration = dayjs.duration(this._timer.secondsSet, 'seconds');

    this.webSocketUpdate({
      state: state,
      setTime: this.totalSeconds,
      setTimeHms: setTimeDuration.format('HH:mm:ss'),
      setTimeMs: setTimeDuration.format('mm:ss'),
      setTimeH: setTimeDuration.format('HH'),
      setTimeM: setTimeDuration.format('mm'),
      setTimeS: setTimeDuration.format('ss'),
      currentTimeHms: currentTimeDuration.format('HH:mm:ss'),
      currentTimeMs: currentTimeDuration.format('mm:ss'),
      currentTimeH: currentTimeDuration.format('HH'),
      currentTimeM: currentTimeDuration.format('mm'),
      currentTimeS: currentTimeDuration.format('ss'),
      currentTime: this._currentSeconds,
      timeSetOnCurrentTimer: this._timer.secondsSet,
      timeSetOnCurrentTimerHms: timeSetOnCurrentTimerDuration.format('HH:mm:ss'),
      timeSetOnCurrentTimerMs: timeSetOnCurrentTimerDuration.format('mm:ss'),
      timeSetOnCurrentTimerH: timeSetOnCurrentTimerDuration.format('HH'),
      timeSetOnCurrentTimerM: timeSetOnCurrentTimerDuration.format('mm'),
      timeSetOnCurrentTimerS: timeSetOnCurrentTimerDuration.format('ss'),
      timerEndsAt: this.endsAt(),
    })
  }

  _timerStatusChanged() {
    this.timerIsRunning = this._timer.isRunning();
  }
}
