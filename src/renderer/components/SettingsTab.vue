<template>
  <card class="flex flex-1 gap-2 min-h-0">
    <card class="inline-block border flex flex-col">
      <div class="flex flex-col overflow-y-scroll">
        <p class="text-2xl">Screen</p>
        <select v-model="currentScreen" class="border rounded p-2">
          <option :value="null">-</option>
          <option
            v-for="(screen, index) in screens"
            :key="screen.id"
            :value="screen"
          >
            Screen {{ index }}
            ({{ screen.size.width }}x{{ screen.size.height }}{{ screen.internal ? " Internal" : "" }})
          </option>
        </select>
        <p class="text-base">X</p>
        <input v-model="window.x" type="number" class="input">
        <p class="text-base">Y</p>
        <input v-model="window.y" type="number" class="input">
        <p class="text-base">Width</p>
        <input v-model="window.width" type="number" class="input">
        <p class="text-base">Height</p>
        <input v-model="window.height" type="number" class="input">
        <s-button class="mt-2" type="info" @click.native="updateWindow">Set</s-button>
      </div>
    </card>
    <card class="inline-block border flex flex-col">
      <p class="text-2xl">Presets</p>
      <draggable item-key="index" v-model="presets" handle=".handle" class="flex flex-col my-3 gap-2 overflow-y-scroll items-center">
        <template #item="{element, index}" >
          <div :key="index" class="inline-block" style="max-width: 140px">
            <i class="mdi mdi-menu-swap cursor-pointer handle" />
            <input v-model="presets[index]" class="input text-center" style="max-width: 80px">
            <i class="mdi mdi-trash-can cursor-pointer" @click="deletePreset(index)" />
          </div>
        </template>
      </draggable>
      <s-button type="info" @click.native="addPreset">Add</s-button>
    </card>
    <card class="inline-block border flex flex-col">
      <p class="text-2xl">Timer</p>
      <div>
        <input id="stopTimerAtZero" v-model="stopTimerAtZero" type="checkbox">
        <label for="stopTimerAtZero">Stop timer at 0</label>
      </div>
      <div>
        <input id="showHours" v-model="showHours" type="checkbox">
        <label for="showHours">Show hours</label>
      </div>
      <div>
        <input id="pulseAtZero" v-model="pulseAtZero" type="checkbox">
        <label for="pulseAtZero">Pulse at zero</label>
      </div>
    </card>
    <card class="inline-block border flex flex-col">
      <div class="flex flex-col overflow-y-scroll">
        <p class="text-2xl">Colors</p>
        <p class="text-base">Background</p>
        <color-input v-model="backgroundColor" default-value="#000000" />
        <p class="text-base">Text</p>
        <color-input v-model="textColor" default-value="#ffffff" />
        <p class="text-base">Text on timer finished</p>
        <color-input v-model="timerFinishedTextColor" default-value="#ff0000" />
        <p class="text-base">Clock</p>
        <color-input v-model="clockColor" default-value="#ffffff" />
        <p class="text-base">Clock Text</p>
        <color-input v-model="clockTextColor" default-value="#ffffff" />
      </div>
    </card>
  </card>
</template>

<script>
import Store from 'electron-store'
import { ipcRenderer } from 'electron'
import draggable from 'vuedraggable'
import Card from '../components/Card'
import ColorInput from '../components/ColorInput'
import SButton from './SButton'
import {
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_TEXT_COLOR,
  DEFAULT_TIMER_FINISHED_TEXT_COLOR,
  DEFAULT_CLOCK_COLOR,
  DEFAULT_CLOCK_TEXT_COLOR,
  DEFAULT_PRESETS,
  DEFAULT_STOP_TIMER_AT_ZERO,
  DEFAULT_SHOW_HOURS,
  DEFAULT_PULSE_AT_ZERO,
  DEFAULT_WINDOW_BOUNDS,
} from "../../common/constants";

const store = new Store()

export default {
  name: 'SettingsTab',
  components: {
    ColorInput,
    SButton,
    Card,
    draggable
  },
  props: {
    screens: {
      type: Array,
      default: () => []
    },
    selectedScreen: {
      type: Object,
      default: null
    }
  },
  data () {
    return {
      backgroundColor: store.get('settings.backgroundColor', DEFAULT_BACKGROUND_COLOR),
      textColor: store.get('settings.textColor', DEFAULT_TEXT_COLOR),
      timerFinishedTextColor: store.get('settings.timerFinishedTextColor', DEFAULT_TIMER_FINISHED_TEXT_COLOR),
      clockColor: store.get('settings.clockColor', DEFAULT_CLOCK_COLOR),
      clockTextColor: store.get('settings.clockTextColor', DEFAULT_CLOCK_TEXT_COLOR),
      presets: store.get('settings.presets', DEFAULT_PRESETS),
      stopTimerAtZero: store.get('settings.stopTimerAtZero', DEFAULT_STOP_TIMER_AT_ZERO),
      showHours: store.get('settings.showHours', DEFAULT_SHOW_HOURS),
      pulseAtZero: store.get('settings.pulseAtZero', DEFAULT_PULSE_AT_ZERO),
      window: store.get('window', DEFAULT_WINDOW_BOUNDS)
    }
  },
  computed: {
    currentScreen: {
      get () {
        return this.screens.find((screen) => screen.id === this.window.fullscreenOn);
      },
      set (newValue) {
        this.window.fullscreenOn = newValue !== null ? newValue.id : null;
      }
    }
  },
  methods: {
    save () {
      if (CSS.supports('color', this.backgroundColor)) {
        store.set('settings.backgroundColor', this.backgroundColor)
      }

      if (CSS.supports('color', this.textColor)) {
        store.set('settings.textColor', this.textColor)
      }

      if (CSS.supports('color', this.timerFinishedTextColor)) {
        store.set('settings.timerFinishedTextColor', this.timerFinishedTextColor)
      }

      if (CSS.supports('color', this.clockColor)) {
        store.set('settings.clockColor', this.clockColor)
      }

      if (CSS.supports('color', this.clockTextColor)) {
        store.set('settings.clockTextColor', this.clockTextColor)
      }

      store.set('settings.presets', this.presets)
      store.set('settings.stopTimerAtZero', this.stopTimerAtZero)
      store.set('settings.showHours', this.showHours)
      store.set('settings.pulseAtZero', this.pulseAtZero)

      this.saveWindowBounds()

      this.$emit('settings-updated')
      ipcRenderer.send('settings-updated')
    },
    saveWindowBounds() {
      store.set('window.fullscreenOn', this.window.fullscreenOn)
      store.set('window.x', parseInt(this.window.x))
      store.set('window.y', parseInt(this.window.y))
      store.set('window.width', parseInt(this.window.width))
      store.set('window.height', parseInt(this.window.height))
    },
    updateWindow() {
      this.saveWindowBounds();
      ipcRenderer.send('window-updated');
    },
    addPreset () {
      this.presets.push(0)
    },
    deletePreset (index) {
      this.presets.splice(index, 1)
    }
  }
}
</script>

<style scoped>
  .min-h-color {
    min-height: 27px;
  }
</style>
