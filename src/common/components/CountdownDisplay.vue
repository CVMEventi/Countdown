<template>
  <div
    :style="{ backgroundColor }"
    v-if="settings.contentAtReset === ContentAtReset.Empty && update.isReset"
    class="h-full drag overflow-hidden"
  />
  <div
    v-if="settings.contentAtReset !== ContentAtReset.Empty || (settings.contentAtReset === ContentAtReset.Empty && !update.isReset)"
    :style="{ backgroundColor, ...cssVars }"
    class="h-full flex justify-center flex-col drag overflow-hidden"
  >
    <div
      :class="{
        'message-box': true,
        'message-box-fixed-height': settings.messageBoxFixedHeight || !!message,
      }"
    >
      {{ message }}
    </div>
    <div
      v-if="settings.show.timer && ((settings.contentAtReset === ContentAtReset.Full && update.isReset) || !update.isReset)"
      class="text-center text-time font-digital-clock transition-opacity duration-[1000ms]"
      :style="{ color: timerText }"
      :class="timerOpacity"
    >
      {{ settings.show.minusSignOnExtra && update.isCountingUp && !update.isReset && update.currentSeconds !== 0 ? '-' : '' }}{{ timer }}
    </div>
    <progress-bar
      v-if="settings.show.progress && ((settings.contentAtReset === ContentAtReset.Full && update.isReset) || !update.isReset)"
      :is-expiring="update.isExpiring"
      :is-counting-up="update.isCountingUp"
      :is-reset="update.isReset"
      :value="progressBarPercent"
    />
    <clock
      v-if="showClock"
      :clock-color="settings.colors.clock"
      :text-color="settings.colors.clockText"
      :is-big="settings.contentAtReset === ContentAtReset.Time && update.isReset"
      :seconds-on-clock="settings.show.secondsOnClock"
      :use12-hour-clock="settings.use12HourClock"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import { ContentAtReset, WindowSettings } from '../config.ts'
import { TimerEngineUpdate } from '../TimerInterfaces.ts'
import ProgressBar from './ProgressBar.vue'
import Clock from './Clock.vue'

dayjs.extend(duration)

interface Props {
  update: TimerEngineUpdate
  settings: WindowSettings
  timerDuration?: number
  message?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  timerDuration: 1000,
  message: null,
})

const timerOpacity = computed(() => {
  if (!props.update.isReset && props.update.isCountingUp && props.settings.pulseAtZero) {
    return props.update.currentSeconds % 2 ? 'pulse-1' : 'pulse-2'
  }
  return 'opacity-100'
})

const timer = computed(() => {
  const currentTimeInSeconds = dayjs.duration(Math.abs(props.update.currentSeconds), 'seconds')
  if (props.settings.show.hours) {
    return currentTimeInSeconds.format('HH:mm:ss')
  }
  const minutes = String(Math.floor(currentTimeInSeconds.asMinutes())).padStart(2, '0')
  const seconds = String(currentTimeInSeconds.seconds()).padStart(2, '0')
  return `${minutes}:${seconds}`
})

const showClock = computed(() => {
  if (props.update.isReset) {
    if (props.settings.contentAtReset === ContentAtReset.Time) return true
    if (props.settings.contentAtReset !== ContentAtReset.Empty && props.settings.show.clock) return true
  }
  return props.settings.show.clock
})

const progressBarPercent = computed(() => {
  if (props.update.secondsSetOnCurrentTimer === 0 || props.update.currentSeconds === 0) return 100
  if (props.update.isCountingUp) return 100
  return props.update.currentSeconds * 100 / props.update.secondsSetOnCurrentTimer
})

const timerText = computed(() => {
  if (props.update.isCountingUp && !props.update.isReset) {
    return props.settings.colors.timerFinishedText
  }
  return props.settings.colors.text
})

const backgroundColor = computed(() => {
  return props.update.isReset ? props.settings.colors.resetBackground : props.settings.colors.background
})

const cssVars = computed(() => ({
  '--message-length': props.message?.length ?? 1,
  '--magic-number-font-size': 17,
  '--animation-duration': `${props.timerDuration}ms`,
}))
</script>

<style scoped>
.drag {
  -webkit-user-select: none;
  -webkit-app-region: drag;
}

.text-time {
  font-size: min(40vh, 25vw);
}

.font-digital-clock {
  font-family: digital-7, monospace;
}

.message-box {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: min(18vh, 12vw, calc(min(18vh, 12vw) * var(--magic-number-font-size) / var(--message-length)));
  color: white;
  text-align: center;
  line-height: 1;
}

.message-box-fixed-height {
  height: min(18vh, 12vw);
}

.pulse-1 {
  animation: pulse-1 var(--animation-duration) cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.pulse-2 {
  animation: pulse-2 var(--animation-duration) cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse-1 {
  0%, 100% { opacity: 1; }
  50% { opacity: .5; }
}

@keyframes pulse-2 {
  0%, 100% { opacity: 1; }
  50% { opacity: .5; }
}
</style>
