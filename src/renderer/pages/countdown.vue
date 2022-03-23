<template>
  <div :style="{
    backgroundColor: settings.backgroundColor
  }" class="flex justify-center flex-col drag"
  >
    <div
      class="text-center text-time font-digital-clock"
      :style="{
        color: timerText
      }"
    >
      {{ time }}
    </div>
    <div class="relative pt-1 px-5">
      <div
        class="overflow-hidden progress-bar mb-4 text-xs flex rounded"
        :class="{
          'bg-red-200': isCountingUp && !isReset,
          'bg-green-200': !isCountingUp && !isReset,
          'bg-gray-200': isReset
        }"
      >
        <div
          :style="{width: progressBarPercent}"
          class="transition shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center"
          :class="{
            'bg-red-700': isCountingUp && !isReset,
            'bg-green-500': !isCountingUp && !isReset
          }"
        />
      </div>
    </div>
    <div class="text-center text-clock font-digital-clock">
      <i :style="{color: settings.clockColor}" class="mdi-set mdi-clock" />
      <span :style="{color: settings.clockTextColor}">{{ currentTime }}</span>
    </div>
  </div>
</template>

<script>
import { ipcRenderer } from 'electron'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import Store from 'electron-store'

let store = new Store()

dayjs.extend(duration)

export default {
  layout: 'countdown',
  data () {
    return {
      currentTimeTimerId: null,
      currentTime: dayjs().format('HH:mm'),
      update: {
        current: 0,
        of: 0
      },
      settings: store.get('settings')
    }
  },
  computed: {
    time () {
      let currentTimeInSeconds = dayjs.duration(Math.abs(this.update.current), 'seconds')

      if (this.settings.showHours ?? true) {
        return currentTimeInSeconds.format('HH:mm:ss')
      } else {
        return currentTimeInSeconds.format('mm:ss')
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
    isCountingUp () {
      return this.update.current <= 0
    },
    timerText () {
      if (this.isCountingUp && !this.isReset) {
        return this.settings.timerFinishedTextColor
      } else {
        return this.settings.textColor
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
    if (this.currentTimeTimerId === null) {
      setInterval(this.updateTime, 1000)
    }
  },
  methods: {
    updateTime () {
      this.currentTime = dayjs().format('HH:mm')
    }
  }
}
</script>

<style scoped>
.drag {
  -webkit-user-select: none;
  -webkit-app-region: drag;
}

.text-time {
  font-size: 40vh;
}

.text-clock {
  font-size: 20vh;
}

.progress-bar {
  height: 12vh
}
</style>
