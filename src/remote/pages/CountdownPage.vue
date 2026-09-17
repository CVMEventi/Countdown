<template>
  <div class="w-screen h-screen">
    <CountdownDisplay
      v-if="timerId"
      :update="resolvedUpdate"
      :settings="windowSettings"
      :timer-duration="timerDuration"
      :message="message"
    />
    <div v-else class="flex items-center justify-center h-full bg-black text-white text-xl">
      No timer configured {{ timerId }}
    </div>
    <!-- Any click on the page unlocks the sound, see unlockSound -->
    <button
      v-if="showSoundPrompt"
      class="fixed bottom-3 right-3 rounded-full bg-black/60 px-3 py-1.5 text-sm text-white"
    >
      Click to enable sound
    </button>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
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

const { timers, updates, messages, onAudio, onAudioStop } = useWebSocketTimerState()

// Browsers block audio until the page has been interacted with. A single element is reused
// because some browsers (Safari) only allow later playback on an element unlocked by a click
const sound = new Audio()
const soundUnlocked = ref(false)

const audioUrl = () => `/timer/${encodeURIComponent(props.timerId)}/audio?t=${Date.now()}`

async function unlockSound() {
  soundUnlocked.value = true
  sound.muted = true
  sound.src = audioUrl()
  try {
    await sound.play()
  } catch {}
  sound.pause()
  sound.muted = false
}

onMounted(() => {
  // Some embedders (e.g. OBS browser sources) allow autoplay, so no click is needed
  const context = new AudioContext()
  soundUnlocked.value = context.state === 'running'
  context.close()
  document.addEventListener('pointerdown', unlockSound, { once: true })
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', unlockSound)
  sound.pause()
})

onAudio((timerId) => {
  if (timerId !== props.timerId) return
  sound.src = audioUrl()
  sound.play().catch(() => {})
})

onAudioStop((timerId) => {
  if (timerId !== props.timerId) return
  sound.pause()
})


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

const showSoundPrompt = computed(() => !soundUnlocked.value && !!currentTimerSettings.value.audioFile)

const timerDuration = computed(() => currentTimerSettings.value.timerDuration ?? 1000)

// Messages belong to the window's own timer, even while it is displaying a followed one,
// which is how the countdown windows in the app behave
const message = computed(() => messages[props.timerId] ?? null)

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
