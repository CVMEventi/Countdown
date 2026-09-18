import {BaseMigration} from "./BaseMigration.ts";
import {DEFAULT_WEBRTC_SPA_URL} from '@common/config.ts'

// The address shipped as empty before the hosted page existed, and that empty value is already
// persisted, so the new default only reaches existing installs by being written in. An address
// the user chose themselves is left alone.
export class SetDefaultWebRtcSpaUrl implements BaseMigration {
  migrate(oldConfig: {[key: string]: unknown}): {[key: string]: unknown} {
    if ((oldConfig.version as number) >= 5) return oldConfig

    const settings = (oldConfig.settings ?? {}) as {[key: string]: unknown}
    const remote = (settings.remote ?? {}) as {[key: string]: unknown}
    const current = remote.webrtcSpaUrl

    return {
      ...oldConfig,
      version: 5,
      settings: {
        ...settings,
        remote: {
          ...remote,
          webrtcSpaUrl: typeof current === 'string' && current.trim() !== '' ? current : DEFAULT_WEBRTC_SPA_URL,
        },
      },
    }
  }
}
