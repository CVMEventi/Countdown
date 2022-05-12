<template>
  <div
    :style="{
      backgroundColor: backgroundColor,
    }"
    v-if="settings.blackAtReset && isReset" class="drag"></div>
  <div
    v-if="!settings.blackAtReset || (settings.blackAtReset && !isReset)"
    :style="{
      backgroundColor: backgroundColor,
      ...cssVars
    }"
    class="flex justify-center flex-col drag"
  >
    <div
      v-if="settings.show.timer"
      class="text-center text-time font-digital-clock"
      :style="{
        color: timerText
      }"
      :class="{
        'animate-pulse-fast': !this.isReset && this.isCountingUp && this.settings.pulseAtZero
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
          'bg-red-200': isCountingUp && !isReset,
          'bg-green-200': !isCountingUp && !isReset && !isYellowBar,
          'bg-yellow-200': isYellowBar,
          'bg-gray-200': isReset
        }"
      >
        <div
          :style="{width: progressBarPercent}"
          class="transition shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center"
          :class="{
            'bg-red-700': isCountingUp && !isReset,
            'bg-green-500': !isCountingUp && !isReset && !isYellowBar,
            'bg-yellow-500': isYellowBar,
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

<script>
import { ipcRenderer } from 'electron'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import Store from "electron-store"
import { DEFAULT_STORE, DEFAULT_FONT } from "../../common/constants";
import { ClockIcon } from '@heroicons/vue/solid';

let store = new Store()

dayjs.extend(duration)

export default {
  name: 'countdown',
  components: {
    ClockIcon,
  },
  data () {
    return {
      currentTimeTimerId: null,
      currentTime: dayjs().format('HH:mm'),
      update: {
        current: 0,
        of: 0
      },
      settings: store.get('settings', DEFAULT_STORE.defaults.settings)
    }
  },
  computed: {
    time () {
      const currentTimeInSeconds = dayjs.duration(Math.abs(this.update.current), 'seconds')

      if (this.settings.showHours) {
        return currentTimeInSeconds.format('HH:mm:ss')
      } else {
        let minutes = String(Math.floor(currentTimeInSeconds.asMinutes())).padStart(2, '0');
        let seconds = String(currentTimeInSeconds.seconds()).padStart(2, '0');

        return `${minutes}:${seconds}`;
      }
    },
    progressBarPercent () {
      if (this.update.of === 0 || this.update.current === 0) return '100%'
      if (this.isCountingUp) return '100%'
      const percentage = this.update.current * 100 / this.update.of
      return `${percentage}%`
    },
    isReset () {
      return this.update.of === 0 && this.update.current === 0
    },
    isYellowBar() {
      if (this.isReset || this.isCountingUp) {
        return false;
      }

      if (this.settings.yellowAtOption === 'minutes'
        && this.settings.yellowAtMinutes >= this.update.current / 60) {
        return true;
      }

      if (this.settings.yellowAtOption === 'percent'
        && this.settings.yellowAtPercent >= this.update.of / 100 * this.update.current) {
        return true;
      }

      return false;
    },
    isCountingUp () {
      return this.update.current <= 0
    },
    timerText () {
      if (this.isCountingUp && !this.isReset) {
        return this.settings.timerFinishedTextColor
      } else {
        return this.settings.textColor
      }
    },
    backgroundColor() {
      return this.settings.backgroundColor + parseInt(this.settings.backgroundColorOpacity).toString(16).padStart(2, "0");
    },
    cssVars() {
      return {
        '--clock-font': this.settings.font || DEFAULT_FONT,
      }
    }
  },
  mounted () {
    ipcRenderer.on('command', (event, arg) => {
      console.log(arg)
      this.update = arg
    })
    ipcRenderer.on('settings-updated', (event, arg) => {
      store = new Store()
      this.settings = store.get('settings')
    })
    ipcRenderer.on('temporary-settings-updated', (event, arg) => {
      this.settings = {
        ...this.settings,
        ...arg,
      }
    })
    if (this.currentTimeTimerId === null) {
      setInterval(this.updateTime, 1000)
    }
  },
  methods: {
    updateTime () {
      this.currentTime = dayjs().format('HH:mm')
    },
  }
}
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
</style>
