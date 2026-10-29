<template>
  <div class="timer-window h-full" :class="{'timer-window-visible': visible}">
    <CountdownDisplay
      :update="resolvedUpdate"
      :settings="settings"
      :timer-duration="timerSettings.timerDuration"
      :message="messageUpdate.message"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, ref } from 'vue'
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
const visible = ref(false)
api.onWindowVisibility((_event, shown) => { visible.value = shown })

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
  const [savedSettings, savedTimer] = await Promise.all([
    api.getWindowSettings(args),
    api.getSettings(`timers.${timerId.value}`),
  ])
  settings.value = savedSettings
  timerSettings.value = savedTimer

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
  await nextTick()
  await document.fonts.ready
  api.windowReady()
})
</script>

<style scoped>
.timer-window {
  opacity: 0;
  transition: opacity 180ms ease-in;
}

.timer-window-visible {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .timer-window {
    transition: none;
  }
}
</style>
