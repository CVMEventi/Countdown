<template>
  <div class="main-container flex flex-col bg-zinc-700">
    <timer ref="timer" @timer-tick="timerTick" @timer-status-change="timerStatusChange"/>
    <div class="flex flex-row justify-between p-1 gap-2">
      <nav class="relative z-0 rounded-lg shadow flex divide-x divide-gray-200" aria-label="Tabs">
        <tab-button
          first
          :selected="selectedTab === 'countdown'"
          @click="selectedTab = 'countdown'"
        >
          Countdown
        </tab-button>
        <tab-button
          last
          :selected="selectedTab === 'settings'"
          @click="selectedTab = 'settings'"
        >
          Settings
        </tab-button>
      </nav>
      <s-button
        v-if="selectedTab === 'settings'"
        class="self-end"
        @click="$refs.settingsTab.save()"
      >
        Save
      </s-button>
    </div>
    <div v-if="selectedTab === 'countdown'" class="countdown-tab">
      <div class="flex gap-2">
        <card class="clock-setup overflow-y-scroll justify-center">
          <div class="uppercase text-white">Set</div>
          <time-input v-model="totalSeconds" color="white"/>
          <div class="uppercase mt-2 text-white">Count</div>
          <time-input v-model="countSeconds" color="green" :disabled="true"/>
          <div class="uppercase mt-2 text-white">Extra</div>
          <time-input color="red" v-model="extraSeconds" :disabled="true"/>
        </card>
        <card class="control-buttons overflow-y-scroll">
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
          <!--<s-button
            class="text-4xl mb-2 font-mono uppercase"
            type="danger"
            @click="startServer"
          >
            Start
          </s-button>
          <s-button
            class="text-4xl mb-2 font-mono uppercase"
            type="danger"
            @click="stopServer"
          >
            Stop
          </s-button>-->
        </card>
      </div>
      <card class="presets inline-flex gap-2 overflow-y-scroll">
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
      v-if="selectedTab === 'settings'"
      ref="settingsTab"
      :screens="screens"
      :selected-screen="selectedScreen"
      @settings-updated="settingsUpdated"
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
import Jog from "../components/Jog";
import { PlusIcon, MinusIcon } from '@heroicons/vue/outline';

let store = new Store()

export default {
  components: {
    Jog,
    SettingsTab,
    Card,
    SButton,
    Timer,
    TimeInput,
    TabButton,
    PlusIcon,
    MinusIcon,
  },
  layout: 'default',
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
      settings: store.get('settings')
    }
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
    }
  },
  async mounted() {
    this.screens = await ipcRenderer.invoke('get-screens')
    ipcRenderer.on('remote-command', (event, ...args) => {
      switch (args[0]) {
        case 'start':
          if (args[1] !== undefined) {
            this.totalSeconds = parseInt(args[1]) * 60
          }
          this.start()
          break
        case 'set':
          this.totalSeconds = parseInt(args[1]) * 60
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
      }

      console.log(args)
    })
  },
  methods: {
    start() {
      this.secondsSetOnCurrentTimer = this.totalSeconds
      this.$refs.timer.start(this.totalSeconds, store.get('settings.stopTimerAtZero') ?? false)
    },
    toggleTimer() {
      this.$refs.timer.toggle()
    },
    timerTick(seconds) {
      this.currentSeconds = seconds
      ipcRenderer.send('send-to-countdown-window', {
        current: this.currentSeconds,
        of: this.$refs.timer.secondsSet
      })
    },
    timerStatusChange() {
      this.timerIsRunning = this.$refs.timer.isRunning
    },
    reset() {
      this.$refs.timer.reset()
      this.totalSeconds = 0
      this.secondsSetOnCurrentTimer = 0
    },
    setPresetTime(minutes) {
      const secondsPerMinute = 60
      this.totalSeconds = minutes * secondsPerMinute
    },
    settingsUpdated() {
      store = new Store()
      this.settings = store.get('settings')
    },
    async startServer() {
      ipcRenderer.send('webserver-manager', 'start')
      console.log(await ipcRenderer.invoke('server-running'))
    },
    async stopServer() {
      ipcRenderer.send('webserver-manager', 'stop')
      console.log(await ipcRenderer.invoke('server-running'))
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
    }
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
  padding: 0 10px 10px 10px;
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
