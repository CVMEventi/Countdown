<template>
  <div
    :style="{
      backgroundColor: update.isReset ? settings.colors.resetBackground : backgroundColor,
    }"
    v-if="settings.contentAtReset === ContentAtReset.Empty && update.isReset" class="h-full drag"></div>
  <div
    v-if="settings.contentAtReset !== ContentAtReset.Empty || (settings.contentAtReset === ContentAtReset.Empty && !update.isReset)"
    :style="{
      backgroundColor: update.isReset ? settings.colors.resetBackground : backgroundColor,
      ...cssVars
    }"
    class="h-full flex justify-center flex-col drag"
  >
    <div
      :class="{
        'message-box': true,
        'message-box-fixed-height': settings.messageBoxFixedHeight || !!messageUpdate.message,
      }"
    >
      {{ messageUpdate.message }}
    </div>
    <div
      v-if="settings.show.timer && ((settings.contentAtReset === ContentAtReset.Full && update.isReset) || !update.isReset)"
      class="text-center text-time font-digital-clock"
      :style="{
        color: timerText
      }"
      :class="{
        'animate-pulse-fast': !update.isReset && update.isCountingUp && settings.pulseAtZero
      }"
    >
      {{ timer }}
    </div>
    <progress-bar
      v-if="settings.show.progress && ((settings.contentAtReset === ContentAtReset.Full && update.isReset) || !update.isReset)"
      :is-expiring="update.isExpiring"
      :is-counting-up="update.isCountingUp"
      :is-reset="update.isReset"
      :value="progressBarPercent" />
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
import {computed, onMounted, ref} from "vue";
import {ipcRenderer} from 'electron'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import {
  ContentAtReset,
  DEFAULT_WINDOW_SETTINGS,
  WindowSettings
} from "../../common/config";
import {MessageUpdate, TimerEngineUpdate} from "../../common/TimerInterfaces";
import ProgressBar from "../components/ProgressBar.vue";
import Clock from "../components/Clock.vue";
import {IpcGetWindowSettingsArgs} from "../../common/IpcInterfaces";

dayjs.extend(duration)

let update = ref<TimerEngineUpdate>({
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
});
let messageUpdate = ref<MessageUpdate>({
  message: null,
})
let settings = ref<WindowSettings>(DEFAULT_WINDOW_SETTINGS);

const timer = computed(() => {
  const currentTimeInSeconds = dayjs.duration(Math.abs(update.value.currentSeconds), 'seconds')

  if (settings.value.show.hours) {
    return currentTimeInSeconds.format('HH:mm:ss')
  } else {
    let minutes = String(Math.floor(currentTimeInSeconds.asMinutes())).padStart(2, '0');
    let seconds = String(currentTimeInSeconds.seconds()).padStart(2, '0');

    return `${minutes}:${seconds}`;
  }
});

const showClock = computed(() => {
  if (update.value.isReset) {
    if (settings.value.contentAtReset === ContentAtReset.Time) return true;
    if (settings.value.contentAtReset !== ContentAtReset.Empty && settings.value.show.clock) return true;
  }
  return settings.value.show.clock;
});

const progressBarPercent = computed(() => {
  if (update.value.secondsSetOnCurrentTimer === 0 || update.value.currentSeconds === 0) return 100;
  if (update.value.isCountingUp) return 100;
  return update.value.currentSeconds * 100 / update.value.secondsSetOnCurrentTimer;
});

const timerText = computed(() => {
  if (update.value.isCountingUp && !update.value.isReset) {
    return settings.value.colors.timerFinishedText
  } else {
    return settings.value.colors.text
  }
})

const backgroundColor = computed(() => {
  return settings.value.colors.background;
})

const cssVars = computed(() => {
  return {
    '--message-length': messageUpdate.value.message?.length ?? 1,
    '--magic-number-font-size': 17,
  }
});

const queryString = new URLSearchParams(window.location.search);
const timerId = ref(queryString.get('timer'))
const windowId = ref(queryString.get('window'))

onMounted(async () => {

  const args: IpcGetWindowSettingsArgs = {
    timerId: timerId.value,
    windowId: windowId.value,
  }
  settings.value = await ipcRenderer.invoke('settings:get-window', args)

  ipcRenderer.on('update', (event, arg) => {
    update.value = arg;
  })
  ipcRenderer.on('message', (event, arg) => {
    console.log(arg);
    messageUpdate.value = arg;
  })
  ipcRenderer.on('settings:updated', (event, arg) => {
    settings.value = {
      ...settings.value,
      ...arg,
    }
  })
});
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
</style>
