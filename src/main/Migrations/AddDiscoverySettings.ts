import {BaseMigration} from "./BaseMigration.ts";
import {DEFAULT_DISCOVERY_ENABLED} from '@common/config.ts'

// electron-store merges defaults only at the top level, so nested remote keys must be written in
export class AddDiscoverySettings implements BaseMigration {
  migrate(oldConfig: {[key: string]: unknown}): {[key: string]: unknown} {
    if ((oldConfig.version as number) >= 8) return oldConfig

    const settings = (oldConfig.settings ?? {}) as {[key: string]: unknown}
    const remote = (settings.remote ?? {}) as {[key: string]: unknown}

    return {
      ...oldConfig,
      version: 8,
      settings: {
        ...settings,
        remote: {
          discoveryEnabled: DEFAULT_DISCOVERY_ENABLED,
          ...remote,
        },
      },
    }
  }
}
