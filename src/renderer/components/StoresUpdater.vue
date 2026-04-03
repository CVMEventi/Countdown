<template>

</template>

<script setup lang="ts">
  import {useTimersStore} from "../stores/timers.ts"
  const {api} = window;
  import {useSettingsStore} from '../stores/settings.ts'
  import {onBeforeMount, onUnmounted, toRaw, watch} from 'vue'
  import {useDebounceFn, watchIgnorable} from '@vueuse/core'
  import {WindowBounds} from '../../common/config.ts'
  import {useGlobalStore} from '../stores/global.ts'

  const timersStore = useTimersStore()
  const settingsStore = useSettingsStore()
  const globalStore = useGlobalStore()

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

  watch(() => {
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

  watch(() => globalStore.currentTimer, () => {
    if (globalStore.currentTimer) {
      api.currentTimerSet(globalStore.currentTimer)
    }
  })

  const save = useDebounceFn(async () => {
    await api.setSettings(null, toRaw(settingsStore.settings))
    api.settingsUpdated()
  }, 200)

  onBeforeMount(async () => {
    const newSettings = await api.getSettings()
    ignoreUpdates(() => {
      settingsStore.settings = newSettings
    })
  })
</script>

<style scoped>

</style>
