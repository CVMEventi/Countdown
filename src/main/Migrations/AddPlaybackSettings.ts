import {BaseMigration} from "./BaseMigration.ts";
import {DEFAULT_PLAYBACK_SETTINGS, PlaybackSettings} from '@common/playback.ts'

// electron-store merges defaults only at the top level, so an existing file's `settings` key
// discards every nested default. Without this the new keys never reach an upgrading install.
//
// Only the playback container is materialised here: a provider added later is filled in from its
// own defaults when read, so it needs no migration of its own.
export class AddPlaybackSettings implements BaseMigration {
  migrate(oldConfig: {[key: string]: unknown}): {[key: string]: unknown} {
    if ((oldConfig.version as number) >= 6) return oldConfig

    const settings = (oldConfig.settings ?? {}) as {[key: string]: unknown}
    const remote = (settings.remote ?? {}) as {[key: string]: unknown}
    const timers = (settings.timers ?? {}) as {[key: string]: {[key: string]: unknown}}
    const storedPlayback = (remote.playback ?? {}) as PlaybackSettings

    return {
      ...oldConfig,
      version: 6,
      settings: {
        ...settings,
        remote: {
          ...remote,
          playback: {...DEFAULT_PLAYBACK_SETTINGS, ...storedPlayback},
        },
        timers: Object.fromEntries(
          Object.entries(timers).map(([timerId, timer]) => [
            timerId,
            {playbackSource: null as string | null, ...timer},
          ]),
        ),
      },
    }
  }
}
