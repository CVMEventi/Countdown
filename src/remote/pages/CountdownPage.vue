<template>
  <div class="w-screen h-screen">
    <CountdownDisplay
      v-if="timerId"
      :update="resolvedUpdate"
      :settings="windowSettings"
      :timer-duration="timerDuration"
    />
    <div v-else class="flex items-center justify-center h-full bg-black text-white text-xl">
      No timer configured {{ timerId }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import CountdownDisplay from '@common/components/CountdownDisplay.vue'
import { useWebSocketTimerState } from '../useWebSocketTimerState.ts'
import { DEFAULT_TIMER_SETTINGS, DEFAULT_WINDOW_SETTINGS, TimerSettings } from '@common/config.ts'
import { TimerEngineUpdate } from '@common/TimerInterfaces.ts'

const route = useRoute()

const props = defineProps<{
  timerId: string
  windowId?: string
}>()

const { timers, updates } = useWebSocketTimerState()

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

const currentTimerSettings = computed<TimerSettings>(() =>
  timers.value[props.timerId] ?? DEFAULT_TIMER_SETTINGS
)

const windowSettings = computed(() => {
  const windows = currentTimerSettings.value.windows ?? {}
  const resolvedWindowId = props.windowId || Object.keys(windows)[0]
  return resolvedWindowId ? (windows[resolvedWindowId] ?? DEFAULT_WINDOW_SETTINGS) : DEFAULT_WINDOW_SETTINGS
})

const timerDuration = computed(() => currentTimerSettings.value.timerDuration ?? 1000)

const resolvedUpdate = computed<TimerEngineUpdate>(() => {
  const update = updates[props.timerId]
  const followTimer = currentTimerSettings.value.followTimer
  if (update && (!update.isReset || followTimer === null)) {
    return update
  }
  if ((update?.isReset ?? true) && followTimer) {
    return updates[followTimer] ?? defaultUpdate
  }
  return defaultUpdate
})
</script>
