import {resolveRemoteShare} from '@common/webrtcStatus.ts'
import type {RemoteShareTarget} from '@common/webrtcStatus.ts'
import {DEFAULT_WEBRTC_CODE_ROTATION} from '@common/config.ts'
import {useWebRtcStore} from './stores/webRtc.ts'
import {useSettingsStore} from './stores/settings.ts'

// The only place that knows both the live peer status and the configured page address. Shared
// components take the resolved target as a prop so they never reach for a store.
export function useRemoteShare() {
  const webRtcStore = useWebRtcStore()
  const settingsStore = useSettingsStore()

  function target(
    options: {id: string, label: string, role: 'control' | 'view', timerId?: string, windowId?: string},
  ): RemoteShareTarget {
    const remote = settingsStore.settings.remote
    return resolveRemoteShare({
      enabled: webRtcStore.enabled,
      state: webRtcStore.state,
      code: options.role === 'control' ? webRtcStore.controlCode : webRtcStore.viewCode,
      spaUrl: remote.webrtcSpaUrl ?? '',
      rotation: remote.webrtcCodeRotation ?? DEFAULT_WEBRTC_CODE_ROTATION,
      id: options.id,
      label: options.label,
      role: options.role,
      timerId: options.timerId,
      windowId: options.windowId,
    })
  }

  return {target}
}
