// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import {BaseMigration} from "./BaseMigration.ts";
import {
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_CLOCK_COLOR,
  DEFAULT_CLOCK_TEXT_COLOR,
  DEFAULT_EXPIRED_CLOCK_COLOR,
  DEFAULT_EXPIRED_CLOCK_TEXT_COLOR,
  DEFAULT_EXPIRED_PROGRESS_BAR_COLOR,
  DEFAULT_EXPIRED_TEXT_COLOR,
  DEFAULT_PROGRESS_BAR_COLOR,
  DEFAULT_PROGRESS_BAR_TRACK_COLOR,
  DEFAULT_RESET_BACKGROUND_COLOR,
  DEFAULT_RESET_CLOCK_COLOR,
  DEFAULT_RESET_CLOCK_TEXT_COLOR,
  DEFAULT_RESET_PROGRESS_BAR_COLOR,
  DEFAULT_TEXT_COLOR,
} from '@common/config.ts'
import {ulid} from 'ulid'

export class MigrateToColorThresholds implements BaseMigration {
  migrate(oldConfig: {[key: string]: unknown}): {[key: string]: unknown} {
    if ((oldConfig.version as number) >= 3) return oldConfig

    const settings = oldConfig.settings as {[key: string]: unknown}
    const timers = (settings.timers ?? {}) as {[key: string]: unknown}

    const newTimers: {[key: string]: unknown} = {}

    Object.entries(timers).forEach(([timerId, timer]) => {
      const t = timer as {[key: string]: unknown}
      const windows = (t.windows ?? {}) as {[key: string]: unknown}
      const newWindows: {[key: string]: unknown} = {}

      const yellowAtOption = t.yellowAtOption as string ?? 'minutes'
      const yellowAtMinutes = t.yellowAtMinutes as number ?? 2
      const yellowAtPercent = t.yellowAtPercent as number ?? 10

      Object.entries(windows).forEach(([windowId, window]) => {
        const w = window as {[key: string]: unknown}
        const oldColors = (w.colors ?? {}) as {[key: string]: unknown}

        const threshold = {
          id: ulid(),
          type: yellowAtOption,
          value: yellowAtOption === 'minutes' ? yellowAtMinutes : yellowAtPercent,
          background: (oldColors.background as string) ?? DEFAULT_BACKGROUND_COLOR,
          text: '#ffff00',
          progressBar: '#eab308',
          progressBarTrack: '#fef9c3',
        }

        newWindows[windowId] = {
          ...w,
          colors: {
            background: (oldColors.background as string) ?? DEFAULT_BACKGROUND_COLOR,
            text: (oldColors.text as string) ?? DEFAULT_TEXT_COLOR,
            resetBackground: (oldColors.resetBackground as string) ?? DEFAULT_RESET_BACKGROUND_COLOR,
            resetText: (oldColors.text as string) ?? DEFAULT_TEXT_COLOR,
            expiredBackground: (oldColors.background as string) ?? DEFAULT_BACKGROUND_COLOR,
            expiredText: (oldColors.timerFinishedText as string) ?? DEFAULT_EXPIRED_TEXT_COLOR,
            expiredProgressBar: DEFAULT_EXPIRED_PROGRESS_BAR_COLOR,
            expiredClock: DEFAULT_EXPIRED_CLOCK_COLOR,
            expiredClockText: DEFAULT_EXPIRED_CLOCK_TEXT_COLOR,
            clock: (oldColors.clock as string) ?? DEFAULT_CLOCK_COLOR,
            clockText: (oldColors.clockText as string) ?? DEFAULT_CLOCK_TEXT_COLOR,
            progressBar: DEFAULT_PROGRESS_BAR_COLOR,
            progressBarTrack: DEFAULT_PROGRESS_BAR_TRACK_COLOR,
            resetProgressBar: DEFAULT_RESET_PROGRESS_BAR_COLOR,
            resetClock: DEFAULT_RESET_CLOCK_COLOR,
            resetClockText: DEFAULT_RESET_CLOCK_TEXT_COLOR,
            thresholds: [threshold],
          },
        }
      })

      const { yellowAtOption: _1, yellowAtMinutes: _2, yellowAtPercent: _3, ...timerRest } = t
      newTimers[timerId] = {
        ...timerRest,
        windows: newWindows,
      }
    })

    return {
      ...oldConfig,
      version: 3,
      settings: {
        ...settings,
        timers: newTimers,
      },
    }
  }
}
