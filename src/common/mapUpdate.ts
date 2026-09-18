import type {TimerEngineUpdate, TimerEngineWebSocketUpdate} from './TimerInterfaces.ts'

export function mapUpdate(u: TimerEngineWebSocketUpdate): TimerEngineUpdate {
  const currentSeconds = u.currentTime ?? 0

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
  }
}
