<template>
  <CountdownDisplay
    :update="resolvedUpdate"
    :settings="settings"
    :timer-duration="timerSettings.timerDuration"
    :message="messageUpdate.message"
  />
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
const { api } = window
import {
  DEFAULT_TIMER_SETTINGS,
  DEFAULT_WINDOW_SETTINGS,
  TimerSettings,
  WindowSettings,
} from '@common/config.ts'
import { MessageUpdate, TimerEngineUpdate, TimerEngineUpdates } from '@common/TimerInterfaces.ts'
import { IpcGetWindowSettingsArgs } from '@common/IpcInterfaces.ts'
import CountdownDisplay from '@common/components/CountdownDisplay.vue'

const updates = ref<TimerEngineUpdates>({})

const defaultUpdate: TimerEngineUpdate = {
  setSeconds: 0,
  countSeconds: 0,
  currentSeconds: 0,
  extraSeconds: 0,
  secondsSetOnCurrentTimer: 0,
  isCountingUp: false,
  isExpiring: false,
  isReset: true,
  isRunning: false,
  timerEndsAt: null,
}

const messageUpdate = ref<MessageUpdate>({ timerId: null, message: null })
const settings = ref<WindowSettings>(DEFAULT_WINDOW_SETTINGS)
const timerSettings = ref<TimerSettings>(DEFAULT_TIMER_SETTINGS)

const queryString = new URLSearchParams(window.location.search)
const timerId = ref(queryString.get('timer'))
const windowId = ref(queryString.get('window'))

const resolvedUpdate = computed<TimerEngineUpdate>(() => {
  const update = updates.value[timerId.value]
  if (update && (!update.isReset || timerSettings.value.followTimer === null)) {
    return update
  }
  if ((update?.isReset ?? true) && timerSettings.value.followTimer) {
    return updates.value[timerSettings.value.followTimer] ?? defaultUpdate
  }
  return defaultUpdate
})

onMounted(async () => {
  const args: IpcGetWindowSettingsArgs = {
    timerId: timerId.value,
    windowId: windowId.value,
  }
  settings.value = await api.getWindowSettings(args)
  timerSettings.value = await api.getSettings(`timers.${timerId.value}`)

  api.onUpdate((event, id: string, update: TimerEngineUpdate) => {
    updates.value[id] = update
  })
  api.onMessage((event, arg) => {
    messageUpdate.value = arg
  })
  api.onSettingsUpdated(async (event, arg) => {
    settings.value = { ...settings.value, ...arg }
    timerSettings.value = await api.getSettings(`timers.${timerId.value}`)
  })
})
</script>

<style scoped>
</style>
