<template>
  <div class="main-container flex flex-col bg-zinc-700">
    <timer ref="timer" @timer-tick="timerTick" @timer-status-change="timerStatusChange"/>
    <div class="flex flex-row justify-between p-1 gap-2 items-center">
      <navigation :selected-tab="tab"/>
      <div class="flex-1"></div>
      <s-button
        v-if="tab === 'remote'"
        class="self-end"
        @click="save"
      >
        Save
      </s-button>
      <card class="bg-white self-end p-0">
        <button class="block" type="button" @click="openURL('https://cvm.it')">
          <img class="h-10" alt="CVM Logo" src="../assets/images/logo.png" />
        </button>
      </card>
    </div>
    <div v-if="tab === 'main'" class="countdown-tab p-1">
      <div class="flex gap-2">
        <card class="clock-setup justify-center">
          <div class="uppercase text-white">Set</div>
          <time-input v-model="totalSeconds" color="white"/>
          <div class="uppercase mt-2 text-white">Count</div>
          <time-input v-model="countSeconds" color="green" :disabled="true"/>
          <div class="uppercase mt-2 text-white">Extra</div>
          <time-input color="red" v-model="extraSeconds" :disabled="true"/>
        </card>
        <card class="control-buttons">
          <s-button class="text-4xl mb-2 font-mono uppercase" @click="start">Start</s-button>
          <s-button
            :disabled="!timerIsRunning && countSeconds === 0"
            class="text-4xl mb-2 font-mono uppercase"
            type="warning"
            @click="toggleTimer"
          >
            {{ timerIsRunning ? "Pause" : "Resume" }}
          </s-button>
          <s-button
            class="text-4xl mb-2 font-mono uppercase"
            type="danger"
            @click="reset"
          >
            Reset
          </s-button>
          <div class="flex gap-2 justify-center">
            <jog @up-click="add(1)" @down-click="sub(1)">
              <template v-slot:up>
                <plus-icon class="w-5 h-5 inline-flex"></plus-icon>
              </template>
              <template v-slot:down>
                <minus-icon class="w-5 h-5 inline-flex"></minus-icon>
              </template>
              1m
            </jog>
            <jog @up-click="add(5)" @down-click="sub(5)">
              <template v-slot:up>
                <plus-icon class="w-5 h-5 inline-flex"></plus-icon>
              </template>
              <template v-slot:down>
                <minus-icon class="w-5 h-5 inline-flex"></minus-icon>
              </template>
              5m
            </jog>
            <jog @up-click="add(10)" @down-click="sub(10)">
              <template v-slot:up>
                <plus-icon class="w-5 h-5 inline-flex"></plus-icon>
              </template>
              <template v-slot:down>
                <minus-icon class="w-5 h-5 inline-flex"></minus-icon>
              </template>
              10m
            </jog>
          </div>
        </card>
      </div>
      <card class="presets inline-flex gap-2 overflow-x-auto">
        <s-button
          v-for="(preset, index) in settings.presets"
          :key="index" type="info"
          @click="setPresetTime(preset)"
        >
          {{ preset }}
        </s-button>
      </card>
    </div>
    <settings-tab
      v-if="tab === 'settings'"
      ref="settingsTab"
      :screens="screens"
      :selected-screen="selectedScreen"
      @settings-updated="settingsUpdated"
    />
    <remote-tab
      v-if="tab === 'remote'"
      ref="remoteTab" />
    <windows-tab
      :screens="screens"
      v-if="tab === 'windows'"
      ref="windowsTab"
    />
  </div>
</template>

<script>
import {ipcRenderer} from 'electron'
import Store from "electron-store"
import Card from '../components/Card'
import SButton from '../components/SButton'
import Timer from '../components/Timer'
import TimeInput from '../components/TimeInput'
import TabButton from '../components/TabButton'
import SettingsTab from '../components/SettingsTab'
import WindowsTab from "../components/WindowsTab";
import Jog from "../components/Jog";
import { PlusIcon, MinusIcon } from '@heroicons/vue/24/outline';
import Navigation from "../components/Navigation";
import { shell } from "electron";
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
dayjs.extend(duration)
import RemoteTab from "../components/RemoteTab";
import { Howl } from "howler";
import gong from "../assets/sounds/gong.mp3";
let sound = new Howl({
  src: [gong],
})

let store = new Store()

export default {
  components: {
    RemoteTab,
    Jog,
    SettingsTab,
    Card,
    SButton,
    Timer,
    TimeInput,
    TabButton,
    PlusIcon,
    MinusIcon,
    Navigation,
    WindowsTab,
  },
  layout: 'default',
  props: {
    tab: String,
  },
  data() {
    return {
      externalContent: '',
      countdownWindow: window,
      selectedScreen: null,
      screens: [],
      totalSeconds: 0,
      currentSeconds: 0,
      secondsSetOnCurrentTimer: 0,
      timerIsRunning: false,
      selectedTab: 'countdown',
      settings: store.get('settings'),
      audioRun: false,
    }
  },
  watch: {
    totalSeconds() {
      this.propsUpdated();
    },
  },
  computed: {
    extraSeconds() {
      if (this.currentSeconds > 0) {
        return 0
      }

      return Math.abs(this.currentSeconds)
    },
    countSeconds() {
      if (this.currentSeconds < 0) {
        return 0
      }

      return this.currentSeconds
    },
    isReset () {
      return this.$refs.timer.secondsSet === 0 && this.currentSeconds === 0
    },
    isCountingUp () {
      return this.currentSeconds <= 0
    },
    isExpiring() {
      if (this.isReset || this.isCountingUp) {
        return false;
      }

      if (this.settings.yellowAtOption === 'minutes'
        && this.settings.yellowAtMinutes >= this.currentSeconds / 60) {
        return true;
      }

      if (this.settings.yellowAtOption === 'percent'
        && this.settings.yellowAtPercent >= this.$refs.timer.secondsSet / 100 * this.currentSeconds) {
        return true;
      }

      return false;
    },
  },
  async mounted() {
    this.screens = await ipcRenderer.invoke('get-screens')

    ipcRenderer.on('screens-updated', async () => {
      this.screens = await ipcRenderer.invoke('get-screens')
    })

    ipcRenderer.on('remote-command', (event, ...args) => {
      let hours = 0;
      let minutes = 0;
      let seconds = 0;

      switch (args[0]) {
        case 'start':
          if (args[1] !== undefined) {
            hours = parseInt(args[1]);
            minutes = parseInt(args[2] || '0');
            seconds = parseInt(args[3] || '0');

            this.totalSeconds = hours * 60 * 60 + minutes * 60 + seconds
          }
          this.start()
          break
        case 'set':
          hours = parseInt(args[1] || '0');
          minutes = parseInt(args[2] || '0');
          seconds = parseInt(args[3] || '0');

          this.totalSeconds = hours * 60 * 60 + minutes * 60 + seconds
          break
        case 'togglePause':
          this.toggleTimer()
          break
        case 'pause':
          this.$refs.timer.stop()
          break
        case 'resume':
          this.$refs.timer.resume()
          break
        case 'reset':
          this.reset()
          break
        case 'startResumePause':
          if (this.timerIsRunning) {
            this.$refs.timer.stop();
            return;
          }

          if (this.countSeconds > 0 && !this.timerIsRunning) {
            this.$refs.timer.resume();
            return;
          }

          this.start();
          break
        case 'jog-set':
          hours = parseInt(args[1] || '0');
          minutes = parseInt(args[2] || '0');
          seconds = parseInt(args[3] || '0');

          this.totalSeconds += hours * 60 * 60 + minutes * 60 + seconds
          break
        case 'jog-current':
          hours = parseInt(args[1] || '0');
          minutes = parseInt(args[2] || '0');
          seconds = parseInt(args[3] || '0');

          this.$refs.timer.add(hours * 60 * 60 + minutes * 60 + seconds);
          break
      }

      console.log(args)
    })
  },
  methods: {
    start() {
      this.secondsSetOnCurrentTimer = this.totalSeconds
      this.audioRun = false;
      this.$refs.timer.start(this.totalSeconds, store.get('settings.stopTimerAtZero') ?? false)
    },
    toggleTimer() {
      this.$refs.timer.toggle()
      ipcRenderer.send('send-to-websocket', {
        state: this.$refs.timer.isRunning ? 'Running' : 'Paused',
      })
    },
    timerTick(seconds) {
      this.currentSeconds = seconds
      ipcRenderer.send('send-to-countdown-window', {
        current: this.currentSeconds,
        of: this.$refs.timer.secondsSet
      })

      const isExpired = this.currentSeconds <= 0;

      let state = 'Running';
      if (isExpired) {
        if (this.settings.audioEnabled && !this.audioRun) {
          sound.play();
          this.audioRun = true;
        }
        state = 'Expired';
      } else if (this.isExpiring) {
        state = 'Expiring';
      }

      const currentTimeDuration = dayjs.duration(Math.abs(this.currentSeconds), 'seconds')
      const timeSetOnCurrentTimerDuration = dayjs.duration(this.$refs.timer.secondsSet, 'seconds')

      ipcRenderer.send('send-to-websocket', {
        state: state,
        currentTimeHms: currentTimeDuration.format('HH:mm:ss'),
        currentTimeMs: currentTimeDuration.format('mm:ss'),
        currentTimeH: currentTimeDuration.format('HH'),
        currentTimeM: currentTimeDuration.format('mm'),
        currentTimeS: currentTimeDuration.format('ss'),
        currentTime: this.currentSeconds,
        timeSetOnCurrentTimer: this.$refs.timer.secondsSet,
        timeSetOnCurrentTimerHms: timeSetOnCurrentTimerDuration.format('HH:mm:ss'),
        timeSetOnCurrentTimerMs: timeSetOnCurrentTimerDuration.format('mm:ss'),
        timeSetOnCurrentTimerH: timeSetOnCurrentTimerDuration.format('HH'),
        timeSetOnCurrentTimerM: timeSetOnCurrentTimerDuration.format('mm'),
        timeSetOnCurrentTimerS: timeSetOnCurrentTimerDuration.format('ss'),
      })
    },
    timerStatusChange() {
      this.timerIsRunning = this.$refs.timer.isRunning
    },
    reset() {
      if (this.secondsSetOnCurrentTimer === 0) {
        this.totalSeconds = 0;
      }

      this.audioRun = true;

      this.$refs.timer.reset()
      this.secondsSetOnCurrentTimer = 0;

      ipcRenderer.send('send-to-websocket', {
        state: 'Not Running',
      })
    },
    setPresetTime(minutes) {
      const secondsPerMinute = 60
      this.totalSeconds = minutes * secondsPerMinute
    },
    settingsUpdated() {
      store = new Store()
      this.settings = store.get('settings')
    },
    add(minutes) {
      if (this.$refs.timer.isRunning) {
        this.$refs.timer.add(minutes * 60);
      } else {
        this.totalSeconds += minutes * 60
      }
    },
    sub(minutes) {
      if (this.$refs.timer.isRunning) {
        this.$refs.timer.sub(minutes * 60)
      } else {
        this.totalSeconds -= minutes * 60
      }
    },
    openURL(url) {
      shell.openExternal(url);
    },
    propsUpdated() {
      const setTimeDuration = dayjs.duration(this.totalSeconds, 'seconds')

      ipcRenderer.send('send-to-websocket', {
        setTime: this.totalSeconds,
        setTimeHms: setTimeDuration.format('HH:mm:ss'),
        setTimeMs: setTimeDuration.format('mm:ss'),
        setTimeH: setTimeDuration.format('HH'),
        setTimeM: setTimeDuration.format('mm'),
        setTimeS: setTimeDuration.format('ss'),
      })
    },
    save() {
      if (this.tab === 'settings') {
        this.$refs.settingsTab.save()
      } else if (this.tab === 'remote') {
        this.$refs.remoteTab.save()
      } else {
        this.$refs.windowsTab.save()
      }
    },
  }
}
</script>

<style scoped>

.main-container {
  height: 100%;
  gap: 10px;
  padding: 0 10px 10px 10px;
}

.countdown-tab {
  @apply flex flex-col gap-2;
}

.clock-setup {
  @apply flex flex-col min-w-fit
}

.control-buttons {
  @apply flex flex-col;
  min-width: 250px;
}

.presets {
}

.top-menu {
  height: 50px;
}
</style>
