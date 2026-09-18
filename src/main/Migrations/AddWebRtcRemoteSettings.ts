import {BaseMigration} from "./BaseMigration.ts";
import {
  DEFAULT_WEBRTC_CODE_ROTATION,
  DEFAULT_WEBRTC_ENABLED,
  DEFAULT_WEBRTC_ICE_SERVERS,
  DEFAULT_WEBRTC_ICE_TRANSPORT_POLICY,
  DEFAULT_WEBRTC_REQUIRE_APPROVAL,
  DEFAULT_WEBRTC_SIGNALING,
  DEFAULT_WEBRTC_SPA_URL,
} from '@common/config.ts'

// electron-store merges defaults only at the top level, so an existing file's `settings` key
// discards every nested default. Without this the new keys never reach an upgrading install.
export class AddWebRtcRemoteSettings implements BaseMigration {
  migrate(oldConfig: {[key: string]: unknown}): {[key: string]: unknown} {
    if ((oldConfig.version as number) >= 4) return oldConfig

    const settings = (oldConfig.settings ?? {}) as {[key: string]: unknown}
    const remote = (settings.remote ?? {}) as {[key: string]: unknown}

    return {
      ...oldConfig,
      version: 4,
      settings: {
        ...settings,
        remote: {
          webrtcEnabled: DEFAULT_WEBRTC_ENABLED,
          webrtcSignaling: {...DEFAULT_WEBRTC_SIGNALING},
          webrtcIceServers: DEFAULT_WEBRTC_ICE_SERVERS.map(server => ({...server})),
          webrtcIceTransportPolicy: DEFAULT_WEBRTC_ICE_TRANSPORT_POLICY,
          webrtcCodeRotation: DEFAULT_WEBRTC_CODE_ROTATION,
          webrtcRoomCode: null,
          webrtcRequireApproval: DEFAULT_WEBRTC_REQUIRE_APPROVAL,
          webrtcSpaUrl: DEFAULT_WEBRTC_SPA_URL,
          ...remote,
        },
      },
    }
  }
}
