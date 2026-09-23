import {Timer} from "./Utilities/Timer.ts";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";
import {
  MessageUpdateCallback, PlaySoundCallback,
  TimerEngineWebSocketUpdate,
  UpdateCallback,
  WebSocketUpdateCallback
} from "../common/TimerInterfaces.ts";
import {ColorThreshold, DEFAULT_SET_TIME_LIVE, DEFAULT_STOP_TIMER_AT_ZERO, getActiveThreshold} from "../common/config.ts";
import {type PlaybackMedia, playbackMediaEquals} from "../common/playback.ts";
dayjs.extend(duration);

/**
 * A playback source painted over the timer. The timer's own clock keeps running underneath and is
 * never touched, so clearing the override reveals it exactly where it would have been.
 */
export interface TimerSourceOverride {
  sourceId: string
  // What the operator called this source, so clients that never see the settings can label it
  sourceName: string
  remainingSeconds: number
  totalSeconds: number
  isRunning: boolean
  title?: string | null
  media?: PlaybackMedia | null
}

export interface TimerEngineOptions {
  setTimeLive?: boolean
  stopTimerAtZero?: boolean
  audioFile?: string | null
  colorThresholds?: ColorThreshold[]
}

export interface TimerEngineConstructorOptions {
  interval: number
  options?: TimerEngineOptions
  onUpdate: UpdateCallback
  onWebSocketUpdate: WebSocketUpdateCallback
  onMessageUpdate: MessageUpdateCallback
  onPlaySound: PlaySoundCallback
}

export class TimerEngine {
  private _currentSeconds = 0;
  private _secondsSetOnCurrentTimer = 0;
  private _audioRun = false;
  private _timer: Timer;
  private _currentInterval = 1000;
  private _message: string | null = null;
  private _sourceOverride: TimerSourceOverride | null = null;

  options: TimerEngineOptions = {
    stopTimerAtZero: DEFAULT_STOP_TIMER_AT_ZERO,
    setTimeLive: DEFAULT_SET_TIME_LIVE,
    audioFile: null,
  }
  totalSeconds = 0;
  timerIsRunning = false;
  audioEnabled = true;
  update: UpdateCallback | null = null;
  webSocketUpdate: WebSocketUpdateCallback | null = null;
  messageUpdate: MessageUpdateCallback | null = null;
  playSound: PlaySoundCallback | null = null;

  constructor({ interval, options, onUpdate, onWebSocketUpdate, onMessageUpdate, onPlaySound }: TimerEngineConstructorOptions) {
    this._timer = new Timer(interval, this._timerTick.bind(this), this._timerStatusChanged.bind(this))
    this.options = {
      ...this.options,
      ...options,
    }

    this.update = onUpdate;
    this.webSocketUpdate = onWebSocketUpdate;
    this.messageUpdate = onMessageUpdate;
    this.playSound = onPlaySound;
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

    return getActiveThreshold(
      this.options.colorThresholds ?? [],
      this._currentSeconds,
      this._timer.secondsSet,
    ) !== null;
  }

  endsAt() {
    return this._displayEndsAt()?.format('HH:mm') ?? null;
  }

  endsAtEpochMs(): number | null {
    return this._displayEndsAt()?.valueOf() ?? null;
  }

  /**
   * Paints a playback source over this timer, or clears it with null.
   *
   * Nothing here touches the underlying Timer: the manual countdown keeps running the whole time
   * an override is displayed, so clearing one reveals it already advanced.
   */
  setSourceOverride(override: TimerSourceOverride | null) {
    const changed = !this._sourceOverrideEquals(this._sourceOverride, override);
    this._sourceOverride = override;
    if (!changed) return;

    this._sendUpdate();
    this._sendWebSocketUpdate();
  }

  hasSourceOverride() {
    return this._sourceOverride !== null;
  }

  private _sourceOverrideEquals(a: TimerSourceOverride | null, b: TimerSourceOverride | null) {
    if (a === null || b === null) return a === b;
    return a.sourceId === b.sourceId
      && a.sourceName === b.sourceName
      && a.remainingSeconds === b.remainingSeconds
      && a.totalSeconds === b.totalSeconds
      && a.isRunning === b.isRunning
      && (a.title ?? null) === (b.title ?? null)
      && playbackMediaEquals(a.media ?? null, b.media ?? null);
  }

  // Display read-throughs. The public isReset/isExpiring/_state keep meaning the internal timer:
  // the end sound latch is bound to them and must keep its own schedule under an override.
  private _displaySeconds() {
    if (this._sourceOverride) return this._sourceOverride.remainingSeconds;
    return this._internalSeconds();
  }

  // What the timer's own clock reads, whether or not a source is painted over it
  private _internalSeconds() {
    if (this.options.setTimeLive && this.isReset()) return this.totalSeconds;
    return this._currentSeconds;
  }

  private _displaySetSeconds() {
    return this._sourceOverride ? this._sourceOverride.totalSeconds : this._secondsSetOnCurrentTimer;
  }

  private _displayIsReset() {
    return this._sourceOverride ? false : this.isReset();
  }

  private _displayIsRunning() {
    return this._sourceOverride ? this._sourceOverride.isRunning : this.timerIsRunning;
  }

  private _displayIsCountingUp() {
    return this._sourceOverride ? this._sourceOverride.remainingSeconds <= 0 : this.isCountingUp();
  }

  private _displayIsExpiring() {
    if (!this._sourceOverride) return this.isExpiring();
    if (this._displayIsCountingUp()) return false;

    return getActiveThreshold(
      this.options.colorThresholds ?? [],
      this._sourceOverride.remainingSeconds,
      this._sourceOverride.totalSeconds,
    ) !== null;
  }

  private _displayState(): string {
    if (!this._sourceOverride) return this._state();
    if (this._sourceOverride.remainingSeconds <= 0) return 'Expired';
    if (!this._sourceOverride.isRunning) return 'Paused';
    return this._displayIsExpiring() ? 'Expiring' : 'Running';
  }

  // Clip seconds are real seconds, so the ms-per-second scaling must not be applied to them
  private _displayEndsAt() {
    if (this._sourceOverride) {
      if (this._sourceOverride.remainingSeconds <= 0) return null;
      return dayjs().add(this._sourceOverride.remainingSeconds, 's');
    }

    return this._internalEndsAt();
  }

  // When the timer's own clock runs out, whatever is painted over the display
  private _internalEndsAt() {
    if (this.countSeconds() <= 0) return null;
    return dayjs().add(this._currentSeconds / 1000 * this._currentInterval, 's');
  }

  setTimerInterval(interval: number) {
    this._currentInterval = interval;
    this._timer.setInterval(interval);
  }

  // Adds time the monotonic clock did not see (e.g. system sleep)
  advanceClock(ms: number) {
    this._timer.advance(ms);
  }

  start() {
    this._secondsSetOnCurrentTimer = this.totalSeconds;
    this._audioRun = false;
    this._timer.start(this.totalSeconds, this.options.stopTimerAtZero ?? false);
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

  get message(): string | null {
    return this._message;
  }

  setMessage(message?: string) {
    this._message = message || null;
    this.messageUpdate?.({
      timerId: '',
      message,
    });
  }

  _timerTick(seconds: number) {
    this._currentSeconds = seconds;
    this._sendUpdate();
    this._sendWebSocketUpdate();
  }

  private _sendUpdate() {
    const currentSeconds = this._displaySeconds();

    this.update?.({
      // Never overridden: the control panel two-way binds its Set box to this
      setSeconds: this.totalSeconds,
      currentSeconds: currentSeconds,
      // Deliberately not from currentSeconds: setTimeLive shows the set time while reset, but
      // count/extra must stay at zero there
      countSeconds: this._sourceOverride
        ? Math.max(this._sourceOverride.remainingSeconds, 0)
        : this.countSeconds(),
      extraSeconds: this._sourceOverride
        ? Math.max(-this._sourceOverride.remainingSeconds, 0)
        : this.extraSeconds(),
      secondsSetOnCurrentTimer: this._displaySetSeconds(),
      isExpiring: this._displayIsExpiring(),
      isReset: this._displayIsReset(),
      isRunning: this._displayIsRunning(),
      isCountingUp: this._displayIsCountingUp(),
      timerEndsAt: this.endsAt() ?? "",
      source: this._sourceOverride?.sourceName ?? null,
      sourceTitle: this._sourceOverride?.title ?? null,
      sourceMedia: this._sourceOverride?.media ?? null,
      timerIsReset: this.isReset(),
      // Raw, so the control panel can split it into its own count and extra exactly as the
      // engine would: setTimeLive is a display rule for the outputs, not for these
      timerCurrentSeconds: this._currentSeconds,
      timerIsRunning: this.timerIsRunning,
      ownEndsAt: this._internalEndsAt()?.format('HH:mm') ?? "",
    })
  }

  private _state(): string {
    if (this.isReset()) return 'Not Running';
    if (!this.timerIsRunning) return 'Paused';
    if (this._currentSeconds <= 0) return 'Expired';
    if (this.isExpiring()) return 'Expiring';
    return 'Running';
  }

  private _sendWebSocketUpdate() {
    // Bound to the internal state on purpose: the timer's own end sound keeps its own schedule
    // even while a playback source is painted over the display
    if (this._state() === 'Expired' && this.audioEnabled && !this._audioRun && this.options.audioFile) {
      this.playSound?.(this.options.audioFile)
      this._audioRun = true;
    }

    this.webSocketUpdate?.(this.webSocketState())
  }

  webSocketState(): TimerEngineWebSocketUpdate {
    const override = this._sourceOverride;
    // mapUpdate rebuilds isReset/isRunning/isExpiring from `state` alone, so an override that did
    // not replace it would leave browser and WebRTC clients showing reset colours mid clip
    const state = this._displayState();

    const currentTime = override ? override.remainingSeconds : this._currentSeconds;
    const timeSetOnCurrentTimer = override ? override.totalSeconds : this._timer.secondsSet;

    const setTimeDuration = dayjs.duration(Math.abs(this.totalSeconds), 'seconds');
    const currentTimeDuration = dayjs.duration(Math.abs(currentTime), 'seconds');
    const timeSetOnCurrentTimerDuration = dayjs.duration(timeSetOnCurrentTimer, 'seconds');

    return {
      state: state,
      source: override?.sourceName ?? null,
      sourceTitle: override?.title ?? null,
      sourceMedia: override?.media ?? null,
      timerState: this._state(),
      timerCurrentTime: this._currentSeconds,
      ownEndsAt: this._internalEndsAt()?.format('HH:mm') ?? "",
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
      currentTime: currentTime,
      timeSetOnCurrentTimer: timeSetOnCurrentTimer,
      timeSetOnCurrentTimerHms: timeSetOnCurrentTimerDuration.format('HH:mm:ss'),
      timeSetOnCurrentTimerMs: timeSetOnCurrentTimerDuration.format('mm:ss'),
      timeSetOnCurrentTimerH: timeSetOnCurrentTimerDuration.format('HH'),
      timeSetOnCurrentTimerM: timeSetOnCurrentTimerDuration.format('mm'),
      timeSetOnCurrentTimerS: timeSetOnCurrentTimerDuration.format('ss'),
      timerEndsAt: this.endsAt() ?? "",
      timerEndsAtEpochMs: this.endsAtEpochMs(),
    }
  }

  _timerStatusChanged() {
    this.timerIsRunning = this._timer.isRunning();
  }
}
