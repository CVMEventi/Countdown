import {ulid} from 'ulid'
import {BaseMigration} from "./BaseMigration.ts";
import {playbackProviderMeta, PlaybackSettings, PlaybackSource} from '@common/playback.ts'

/**
 * Playback settings started as one config per provider, keyed by provider id, with timers pointing
 * at a provider. Several sources of the same kind need a config per *instance*, so each old entry
 * becomes a named source under a ULID and every timer is repointed at its new id.
 */
export class PlaybackProvidersToSources implements BaseMigration {
  migrate(oldConfig: {[key: string]: unknown}): {[key: string]: unknown} {
    if ((oldConfig.version as number) >= 7) return oldConfig

    const settings = (oldConfig.settings ?? {}) as {[key: string]: unknown}
    const remote = (settings.remote ?? {}) as {[key: string]: unknown}
    const timers = (settings.timers ?? {}) as {[key: string]: {[key: string]: unknown}}
    const stored = (remote.playback ?? {}) as {[key: string]: unknown}

    const playback: PlaybackSettings = {}
    // Old provider id -> new source id, so the timers can be repointed
    const remapped: {[providerId: string]: string} = {}

    Object.entries(stored).forEach(([key, value]) => {
      if (!value || typeof value !== 'object') return

      // Already a source (re-running against a partly migrated file): keep it as it is
      const asSource = value as Partial<PlaybackSource>
      if (typeof asSource.provider === 'string' && asSource.config) {
        playback[key] = asSource as PlaybackSource
        return
      }

      const meta = playbackProviderMeta(key)
      if (!meta) return

      const sourceId = ulid()
      remapped[key] = sourceId
      playback[sourceId] = {
        name: meta.displayName,
        provider: key,
        config: {...meta.defaultConfig, ...(value as {[key: string]: unknown})} as PlaybackSource['config'],
      }
    })

    return {
      ...oldConfig,
      version: 7,
      settings: {
        ...settings,
        remote: {...remote, playback},
        timers: Object.fromEntries(
          Object.entries(timers).map(([timerId, timer]) => {
            const source = timer.playbackSource
            if (typeof source !== 'string' || !remapped[source]) return [timerId, timer]
            return [timerId, {...timer, playbackSource: remapped[source]}]
          }),
        ),
      },
    }
  }
}
