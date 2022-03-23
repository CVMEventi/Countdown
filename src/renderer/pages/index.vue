<template>
  <div class="main-container flex flex-col">
    <timer ref="timer" @timer-tick="timerTick" @timer-status-change="timerStatusChange" />
    <div class=" flex flex-row justify-between p-1 gap-2">
      <nav class="relative z-0 rounded-lg shadow flex divide-x divide-gray-200" aria-label="Tabs">
        <tab-button
          first
          :selected="selectedTab === 'countdown'"
          @click.native="selectedTab = 'countdown'"
        >
          Countdown
        </tab-button>
        <tab-button
          last
          :selected="selectedTab === 'settings'"
          @click.native="selectedTab = 'settings'"
        >
          Settings
        </tab-button>
      </nav>
      <s-button v-if="selectedTab === 'settings'" @click.native="$refs.settingsTab.save()" class="self-end">Save</s-button>
    </div>
    <div v-if="selectedTab === 'countdown'" class="countdown-tab min-h-0">
      <card class="clock-setup overflow-y-scroll">
        <div class="uppercase">Set</div>
        <time-input v-model="totalSeconds" color="white" />
        <div>Count</div>
        <time-input v-model="countSeconds" color="green" :disabled="true" />
        <div>Extra</div>
        <time-input color="red" :value="extraSeconds" :disabled="true" />
        <div class="flex-1" />
        <s-button class="text-4xl mt-5 mb-2 font-mono uppercase" @click.native="start">Start</s-button>
        <s-button
          :disabled="!timerIsRunning && countSeconds === 0"
          class="text-4xl mb-2 font-mono uppercase"
          type="warning"
          @click.native="toggleTimer"
        >
          {{ timerIsRunning ? "Pause" : "Resume" }}
        </s-button>
        <s-button
          class="text-4xl mb-2 font-mono uppercase"
          type="danger"
          @click.native="reset"
        >
          Reset
        </s-button>
        <!--<s-button
          class="text-4xl mb-2 font-mono uppercase"
          type="danger"
          @click.native="startServer"
        >
          Start
        </s-button>
        <s-button
          class="text-4xl mb-2 font-mono uppercase"
          type="danger"
          @click.native="stopServer"
        >
          Stop
        </s-button>-->
      </card>
      <card class="presets inline-flex flex-col gap-2 overflow-scroll">
        <s-button
          v-for="(preset, index) in settings.presets"
          :key="index" type="info"
          @click.native="setPresetTime(preset)"
        >
          {{ preset }}
        </s-button>
      </card>
    </div>
    <settings-tab
      v-if="selectedTab === 'settings'"
      :screens="screens"
      :selected-screen="selectedScreen"
      @screen-set="setScreen"
      @settings-updated="settingsUpdated"
      ref="settingsTab"
    />
  </div>
</template>

<script>
import { ipcRenderer } from 'electron'
import Store from 'electron-store'
import Card from '../components/Card'
import SButton from '../components/SButton'
import Timer from '../components/Timer'
import TimeInput from '../components/TimeInput'
import TabButton from '../components/TabButton'
import SettingsTab from '../components/SettingsTab'

let store = new Store()

export default {
  components: {
    SettingsTab,
    Card,
    SButton,
    Timer,
    TimeInput,
    TabButton
  },
  layout: 'default',
  data () {
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
    extraSeconds () {
      if (this.currentSeconds > 0) {
        return 0
      }

      return Math.abs(this.currentSeconds)
    },
    countSeconds () {
      if (this.currentSeconds < 0) {
        return 0
      }

      return this.currentSeconds
    }
  },
  async mounted () {
    this.screens = await ipcRenderer.invoke('get-screens')
    ipcRenderer.on('remote-command', (event, ...args) => {
      switch (args[0]) {
        case 'start':
          if (args[1] !== undefined) {
            this.totalSeconds = parseInt(args[1]) * 60
          }
          this.start()
          break;
        case 'set':
          this.totalSeconds = parseInt(args[1]) * 60
          break;
        case 'togglePause':
          this.toggleTimer()
          break;
        case 'pause':
          this.$refs.timer.stop()
          break;
        case 'resume':
          this.$refs.timer.resume()
          break;
        case 'reset':
          this.reset()
          break;
      }

      console.log(args)
    })
  },
  methods: {
    setScreen(screen) {
      this.selectedScreen = screen
      ipcRenderer.send('manage-countdown-window', 'fullscreen-on', this.selectedScreen)
    },
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
  height: 100%;
  display: grid;
  gap: 10px;
  padding: 0 10px 10px 10px;
  grid-template-columns: 1.2fr 100px 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr 1fr;
}

.clock-setup {
  min-width: 350px;
  grid-column-start: 1;
  grid-column-end: 2;
  grid-row-start: 1;
  grid-row-end: 5;
  @apply flex flex-col
}

.presets {
  grid-column-start: 2;
  grid-column-end: 3;
  grid-row-start: 1;
  grid-row-end: 5;
}

.top-menu {
  height: 50px;
}
</style>
