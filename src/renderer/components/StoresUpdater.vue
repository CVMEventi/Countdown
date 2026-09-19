<template>

</template>

<script setup lang="ts">
  import {useTimersStore} from "../stores/timers.ts"
  const {api} = window;
  import {useSettingsStore} from '../stores/settings.ts'
  import {onBeforeMount, onUnmounted, toRaw, watch} from 'vue'
  import {useDebounceFn, useWindowFocus, watchIgnorable} from '@vueuse/core'
  import {WindowBounds} from '../../common/config.ts'
  import {useGlobalStore} from '../stores/global.ts'
  import {useWebServerStore} from '../stores/webServer.ts'
  import {useWebRtcStore} from '../stores/webRtc.ts'
import {usePlaybackStore} from '../stores/playback.ts'

  const timersStore = useTimersStore()
  const settingsStore = useSettingsStore()
  const globalStore = useGlobalStore()
  const webServerStore = useWebServerStore()
  const webRtcStore = useWebRtcStore()
const playbackStore = usePlaybackStore()

  const emit = defineEmits<{
    (e: 'mounted'): void
  }>()

  const onTimerUpdate = (event: Electron.IpcRendererEvent, timerId: string, update: unknown) => {
    timersStore.updates[timerId] = update
  }
  api.onUpdate(onTimerUpdate)

  /*
  onUnmounted(() => {
    ipcRenderer.removeListener('update', onTimerUpdate)
  })
  */

  const { stop, ignoreUpdates } = watchIgnorable(() => settingsStore.settings, () => {
    save();
  }, {deep: true})

  interface WindowsKV {
    [key: string]: WindowBounds
  }

  interface TimersKV {
    [key: string]: WindowsKV
  }

  const { ignoreUpdates: ignoreBoundsUpdates } = watchIgnorable(() => {
    let timers: TimersKV = {}
    Object.keys(settingsStore.settings.timers).forEach((timerId) => {
      const timer = settingsStore.settings.timers[timerId]
      let windows: WindowsKV = {}
      Object.keys(timer.windows).forEach((windowId) => {
        windows[windowId] = {...timer.windows[windowId].bounds}
      })
      timers[timerId] = windows
    })
    return timers
  }, (newTimers, oldTimers) => {
    Object.keys(newTimers).forEach((timerId) => {
      const windows = newTimers[timerId]
      Object.keys(windows).forEach(async (windowId) => {
        const window = windows[windowId]
        if (!oldTimers[timerId]) return
        if (JSON.stringify(window) !== JSON.stringify(oldTimers[timerId][windowId])) {
          await api.setSettings(`timers.${timerId}.windows.${windowId}.bounds`, window)
          api.windowUpdated(timerId, windowId)
        }
      })
    })
  }, {deep: true})

  // Bounds changed by moving/resizing the window itself are already saved and applied by main:
  // update the store without sending them back
  api.onWindowBoundsUpdated((_event, timerId, windowId, bounds) => {
    const window = settingsStore.settings.timers[timerId]?.windows[windowId]
    if (!window) return
    ignoreUpdates(() => {
      ignoreBoundsUpdates(() => {
        window.bounds = bounds
      })
    })
  })

  watch(() => globalStore.currentTimer, () => {
    if (globalStore.currentTimer) {
      api.currentTimerSet(globalStore.currentTimer)
    }
  })

  const save = useDebounceFn(async () => {
    await api.setSettings(null, toRaw(settingsStore.settings))
    api.settingsUpdated()
  }, 200)

  // Network interfaces change without any event we can listen for (joining Wi-Fi, a VPN coming
  // up), so refresh them at the moments the user could notice a stale list instead of polling
  const refreshNetworkAddresses = async () => {
    webServerStore.addresses = await api.getNetworkAddresses()
  }

  const webServerStatusReceived = (status: { isRunning: boolean, port: number|string|null, lastError: string|null }) => {
    webServerStore.isRunning = status.isRunning
    webServerStore.port = status.port
    webServerStore.lastError = status.lastError
  }

  api.onWebserverUpdate(async (_event, status) => {
    webServerStatusReceived(status)
    await refreshNetworkAddresses()
  })

  api.onPlaybackUpdate((event, statuses) => {
    playbackStore.apply(statuses)
  })

  api.onWebrtcUpdate((_event, status) => {
    webRtcStore.apply(status)
  })

  watch(useWindowFocus(), async (focused) => {
    if (focused) await refreshNetworkAddresses()
  })

  onBeforeMount(async () => {
    const newSettings = await api.getSettings()
    ignoreUpdates(() => {
      settingsStore.settings = newSettings
    })

    webServerStatusReceived(await api.isServerRunning())
    webRtcStore.apply(await api.webrtcStatus())
  playbackStore.apply(await api.playbackStatus())
    await refreshNetworkAddresses()
  })
</script>

<style scoped>

</style>
