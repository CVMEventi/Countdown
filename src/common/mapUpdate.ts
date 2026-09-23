import type {TimerEngineUpdate, TimerEngineWebSocketUpdate} from './TimerInterfaces.ts'

export function mapUpdate(u: TimerEngineWebSocketUpdate): TimerEngineUpdate {
  const currentSeconds = u.currentTime ?? 0
  const timerState = u.timerState ?? u.state

  return {
    setSeconds: u.setTime,
    countSeconds: currentSeconds > 0 ? currentSeconds : 0,
    currentSeconds,
    extraSeconds: currentSeconds < 0 ? Math.abs(currentSeconds) : 0,
    secondsSetOnCurrentTimer: u.timeSetOnCurrentTimer ?? u.setTime,
    isReset: u.state === 'Not Running',
    isRunning: u.state === 'Running' || u.state === 'Expiring' || u.state === 'Expired',
    isExpiring: u.state === 'Expiring',
    isCountingUp: u.state === 'Expired',
    timerEndsAt: u.timerEndsAt ?? null,
    timerEndsAtEpochMs: u.timerEndsAtEpochMs ?? null,
    source: u.source ?? null,
    sourceTitle: u.sourceTitle ?? null,
    sourceMedia: u.sourceMedia ?? null,
    // The timer's own clock, which keeps running under a playback override
    timerIsReset: timerState === 'Not Running',
    timerCurrentSeconds: u.timerCurrentTime ?? currentSeconds,
    timerIsRunning: timerState === 'Running' || timerState === 'Expiring' || timerState === 'Expired',
    ownEndsAt: u.ownEndsAt ?? u.timerEndsAt ?? null,
  }
}
