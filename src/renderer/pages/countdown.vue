<template>
  <div
    :style="{
      backgroundColor: backgroundColor,
    }"
    v-if="settings.blackAtReset && update.isReset" class="drag"></div>
  <div
    v-if="!settings.blackAtReset || (settings.blackAtReset && !update.isReset)"
    :style="{
      backgroundColor: backgroundColor,
      ...cssVars
    }"
    class="flex justify-center flex-col drag"
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
      v-if="settings.show.timer"
      class="text-center text-time font-digital-clock"
      :style="{
        color: timerText
      }"
      :class="{
        'animate-pulse-fast': !update.isReset && update.isCountingUp && settings.pulseAtZero
      }"
    >
      {{ time }}
    </div>
    <div
      v-if="settings.show.progress"
      class="relative pt-1 px-5"
    >
      <div
        class="overflow-hidden progress-bar mb-4 text-xs flex rounded"
        :class="{
          'bg-red-200': update.isCountingUp && !update.isReset,
          'bg-green-200': !update.isReset && !update.isReset && !update.isExpiring,
          'bg-yellow-200': update.isExpiring,
          'bg-gray-200': update.isReset
        }"
      >
        <div
          :style="{width: progressBarPercent}"
          class="transition shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center"
          :class="{
            'bg-red-700': update.isCountingUp && !update.isReset,
            'bg-green-500': !update.isCountingUp && !update.isReset && !update.isExpiring,
            'bg-yellow-500': update.isExpiring,
          }"
        />
      </div>
    </div>
    <div
      v-if="settings.show.clock"
      class="text-center text-clock font-digital-clock"
    >
      <clock-icon class="clock-icon inline-block" :style="{color: settings.clockColor}" />
      <span class="ml-5" :style="{color: settings.clockTextColor}">{{ currentTime }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, defineComponent, onMounted, ref} from "vue";
import { ipcRenderer } from 'electron'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import Store from "electron-store"
import {DEFAULT_STORE, DEFAULT_FONT, CountdownSettings} from "../../common/config";
import { ClockIcon } from '@heroicons/vue/24/solid';
import {MessageUpdate, TimerEngineUpdate} from "../../common/TimerInterfaces";
import {message} from "memfs/lib/internal/errors";

let store = new Store()

dayjs.extend(duration)

defineOptions({
  name: 'countdown',
});

let currentTimeTimerId: NodeJS.Timer = null;
let currentTime = ref(dayjs().format('HH:mm'));
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
let settings = ref<CountdownSettings>(store.get('settings', DEFAULT_STORE.defaults.settings) as CountdownSettings);

const time = computed(() => {
  const currentTimeInSeconds = dayjs.duration(Math.abs(update.value.currentSeconds), 'seconds')

  if (settings.value.showHours) {
    return currentTimeInSeconds.format('HH:mm:ss')
  } else {
    let minutes = String(Math.floor(currentTimeInSeconds.asMinutes())).padStart(2, '0');
    let seconds = String(currentTimeInSeconds.seconds()).padStart(2, '0');

    return `${minutes}:${seconds}`;
  }
});

const progressBarPercent = computed(() => {
  if (update.value.secondsSetOnCurrentTimer === 0 || update.value.currentSeconds === 0) return '100%';
  if (update.value.isCountingUp) return '100%';
  const percentage = update.value.currentSeconds * 100 / update.value.secondsSetOnCurrentTimer;
  return `${percentage}%`;
});

const timerText = computed(() => {
  if (update.value.isCountingUp && !update.value.isReset) {
    return settings.value.timerFinishedTextColor
  } else {
    return settings.value.textColor
  }
})

const backgroundColor = computed(() => {
  // Check for hex with alpha #xxxxxxxx
  if (settings.value.backgroundColor.length > 7) return settings.value.backgroundColor;
  return settings.value.backgroundColor + parseInt(settings.value.backgroundColorOpacity).toString(16).padStart(2, "0");
})

const cssVars = computed(() => {
  return {
    '--clock-font': settings.value.font || DEFAULT_FONT,
    '--message-length': messageUpdate.value.message?.length ?? 1,
    '--magic-number-font-size': 17,
  }
});

function updateTime() {
  if (settings.value.show.secondsOnClock) {
    currentTime.value = dayjs().format('HH:mm:ss');
  } else {
    currentTime.value = dayjs().format('HH:mm');
  }
}

onMounted(() => {
  ipcRenderer.on('update', (event, arg) => {
    update.value = arg;
  })
  ipcRenderer.on('message', (event, arg) => {
    console.log(arg);
    messageUpdate.value = arg;
  })
  ipcRenderer.on('settings-updated', (event, arg) => {
    store = new Store();
    settings.value = store.get('settings') as CountdownSettings;
  })
  ipcRenderer.on('temporary-settings-updated', (event, arg) => {
    settings.value = {
      ...settings.value,
      ...arg,
    }
  })
  if (currentTimeTimerId === null) {
    currentTimeTimerId = setInterval(updateTime, 1000)
  }
});
</script>

<style scoped>
.drag {
  -webkit-user-select: none;
  -webkit-app-region: drag;
}

.clock-icon {
  height: min(20vh, 15vw);
  width: min(20vh, 15vw);
}

.text-time {
  font-size: min(40vh, 25vw);
}

.text-clock {
  font-size: min(20vh, 15vw);
}

.progress-bar {
  height: 12vh
}

.font-digital-clock {
  font-family: var(--clock-font), monospace;
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

10:14=x:25
