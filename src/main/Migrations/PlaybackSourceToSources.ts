import {BaseMigration} from "./BaseMigration.ts";
import type {TimerSourceLink} from '@common/config.ts'

// A timer followed one source; it now follows an ordered list, each with its own message template
export class PlaybackSourceToSources implements BaseMigration {
  migrate(oldConfig: {[key: string]: unknown}): {[key: string]: unknown} {
    if ((oldConfig.version as number) >= 9) return oldConfig

    const settings = (oldConfig.settings ?? {}) as {[key: string]: unknown}
    const timers = (settings.timers ?? {}) as {[key: string]: {[key: string]: unknown}}

    return {
      ...oldConfig,
      version: 9,
      settings: {
        ...settings,
        timers: Object.fromEntries(
          Object.entries(timers).map(([timerId, timer]) => {
            if (Array.isArray(timer.playbackSources)) return [timerId, timer]
            const {playbackSource, ...rest} = timer
            const playbackSources: TimerSourceLink[] = typeof playbackSource === 'string' && playbackSource
              ? [{sourceId: playbackSource, message: ''}]
              : []
            return [timerId, {...rest, playbackSources}]
          }),
        ),
      },
    }
  }
}
