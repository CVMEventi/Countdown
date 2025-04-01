<template>

</template>

<script setup lang="ts">
  import {useTimersStore} from "../stores/timers.ts"
  import {ipcRenderer} from "electron"
  import {useSettingsStore} from '../stores/settings.ts'
  import {onBeforeMount, onMounted, watch} from 'vue'
  import {useDebounceFn, watchIgnorable} from '@vueuse/core'
  import {Timers, WindowBounds, Windows} from '../../common/config.ts'
  import {useGlobalStore} from '../stores/global.ts'

  const timersStore = useTimersStore()
  const settingsStore = useSettingsStore()
  const globalStore = useGlobalStore()

  const emit = defineEmits<{
    (e: 'mounted'): void
  }>()

  ipcRenderer.on('update', (event, timerId: number, update) => {
    timersStore.updates[timerId] = update
  })

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
          await ipcRenderer.invoke('settings:set', `timers.${timerId}.windows.${windowId}.bounds`, JSON.stringify(window))
          ipcRenderer.send('window-updated', timerId, windowId);
        }
      })
    })
  }, {deep: true})

  watch(() => globalStore.currentTimer, () => {
    if (globalStore.currentTimer) {
      ipcRenderer.send('current-timer:set', globalStore.currentTimer)
    }
  })

  const save = useDebounceFn(async () => {
    await ipcRenderer.invoke('settings:set', null, JSON.stringify(settingsStore.settings))
    ipcRenderer.send('settings-updated')
  }, 200)

  onBeforeMount(async () => {
    const newSettings = await ipcRenderer.invoke('settings:get')
    ignoreUpdates(() => {
      settingsStore.settings = newSettings
    })
  })
</script>

<style scoped>

</style>
