<template>
  <card class="flex flex-1 gap-2 min-h-0 text-white">
    <card class="inline-block border flex flex-col p-0">
      <p class="text-2xl p-3 pb-2">Presets (m)</p>
      <draggable item-key="index" v-model="presets" handle=".handle"
                 class="flex flex-col gap-2 overflow-y-scroll items-center pb-1">
        <template #item="{element, index}">
          <div :key="index" class="inline-block w-[140px] px-2">
            <edit-preset v-model="presets[index]" @delete="deletePreset(index)"></edit-preset>
          </div>
        </template>
      </draggable>
      <s-button class="m-3" type="info" @click="addPreset">Add</s-button>
    </card>
    <card class="inline-block border flex flex-col">
      <p class="text-2xl">Timer</p>
      <check-box id="blackAtReset" v-model="blackAtReset">Black at reset</check-box>
      <check-box id="stopTimerAtZero" v-model="stopTimerAtZero">Stop timer at 0</check-box>
      <check-box id="showHours" v-model="showHours">Show hours</check-box>
      <check-box id="pulseAtZero" v-model="pulseAtZero">Pulse at zero</check-box>
      <check-box id="timerAlwaysOnTop" v-model="timerAlwaysOnTop">Window always on top</check-box>
      <p class="text-sm mt-2">Yellow Bar at</p>
      <input-with-button
        @click="updateYellowOption"
        @input="updateYellowValue"
        :model-value="this.yellowAtOption === 'minutes' ? this.yellowAtMinutes : this.yellowAtPercent">
        {{ this.yellowAtOption === 'minutes' ? 'm' : '%' }}
      </input-with-button>
      <p class="text-2xl">Show</p>
      <check-box id="showTimer" v-model="show.timer">Timer</check-box>
      <check-box id="showProgress" v-model="show.progress">Progress</check-box>
      <check-box id="showClock" v-model="show.clock">Clock</check-box>
    </card>
    <card class="inline-block border flex flex-col">
      <div class="flex flex-col" style="min-width: 220px">
        <p class="text-2xl">Colors</p>
        <p class="text-base">Background</p>
        <color-input v-model="backgroundColor" default-value="#000000"/>
        <input @input="realTimeSettingUpdated" v-model="backgroundColorOpacity" type="range" min="0" max="255">
        <p class="text-base">Text</p>
        <color-input v-model="textColor" default-value="#ffffff"/>
        <p class="text-base">Text on timer finished</p>
        <color-input v-model="timerFinishedTextColor" default-value="#ff0000"/>
        <p class="text-base">Clock</p>
        <color-input v-model="clockColor" default-value="#ffffff"/>
        <p class="text-base">Clock Text</p>
        <color-input v-model="clockTextColor" default-value="#ffffff"/>
        <p class="text-2xl mt-3">Font</p>
        <select v-model="font" class="input p-2 text-black">
          <option value="digital-7">digital-7</option>
          <option value="B612">B612</option>
          <option value="Xanh">Xanh</option>
        </select>
      </div>
    </card>
  </card>
</template>

<script>
import Store from 'electron-store'
import {ipcRenderer} from 'electron'
import draggable from 'vuedraggable'
import Card from '../components/Card'
import ColorInput from '../components/ColorInput'
import SButton from './SButton'
import InputWithButton from "./InputWithButton";
import {
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_BACKGROUND_OPACITY,
  DEFAULT_TEXT_COLOR,
  DEFAULT_TIMER_FINISHED_TEXT_COLOR,
  DEFAULT_CLOCK_COLOR,
  DEFAULT_CLOCK_TEXT_COLOR,
  DEFAULT_PRESETS,
  DEFAULT_STOP_TIMER_AT_ZERO,
  DEFAULT_SHOW_HOURS,
  DEFAULT_PULSE_AT_ZERO,
  DEFAULT_WINDOW_BOUNDS,
  DEFAULT_SHOW_SECTIONS,
  DEFAULT_BLACK_AT_RESET,
  DEFAULT_FONT,
  DEFAULT_TIMER_ALWAYS_ON_TOP,
  DEFAULT_YELLOW_AT_OPTION,
  DEFAULT_YELLOW_AT_MINUTES,
  DEFAULT_YELLOW_AT_PERCENT,

} from "../../common/constants";
import CheckBox from "./CheckBox";
import EditPreset from "./EditPreset";

const store = new Store()

export default {
  name: 'SettingsTab',
  components: {
    InputWithButton,
    EditPreset,
    CheckBox,
    ColorInput,
    SButton,
    Card,
    draggable,
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
  data() {
    return {
      backgroundColor: store.get('settings.backgroundColor', DEFAULT_BACKGROUND_COLOR),
      backgroundColorOpacity: store.get('settings.backgroundColorOpacity', DEFAULT_BACKGROUND_OPACITY),
      textColor: store.get('settings.textColor', DEFAULT_TEXT_COLOR),
      timerFinishedTextColor: store.get('settings.timerFinishedTextColor', DEFAULT_TIMER_FINISHED_TEXT_COLOR),
      clockColor: store.get('settings.clockColor', DEFAULT_CLOCK_COLOR),
      clockTextColor: store.get('settings.clockTextColor', DEFAULT_CLOCK_TEXT_COLOR),
      presets: store.get('settings.presets', DEFAULT_PRESETS),
      stopTimerAtZero: store.get('settings.stopTimerAtZero', DEFAULT_STOP_TIMER_AT_ZERO),
      showHours: store.get('settings.showHours', DEFAULT_SHOW_HOURS),
      blackAtReset: store.get('settings.blackAtReset', DEFAULT_BLACK_AT_RESET),
      pulseAtZero: store.get('settings.pulseAtZero', DEFAULT_PULSE_AT_ZERO),
      show: store.get('settings.show', DEFAULT_SHOW_SECTIONS),
      font: store.get('settings.font', DEFAULT_FONT),
      timerAlwaysOnTop: store.get('settings.timerAlwaysOnTop', DEFAULT_TIMER_ALWAYS_ON_TOP),
      yellowAtOption: store.get('settings.yellowAtOption', DEFAULT_YELLOW_AT_OPTION),
      yellowAtMinutes: store.get('settings.yellowAtMinutes', DEFAULT_YELLOW_AT_MINUTES),
      yellowAtPercent: store.get('settings.yellowAtPercent', DEFAULT_YELLOW_AT_PERCENT),
    }
  },
  computed: {
    currentScreen: {
      get() {
        return this.screens.find((screen) => screen.id === this.window.fullscreenOn);
      },
      set(newValue) {
        this.window.fullscreenOn = newValue !== null ? newValue.id : null;
      }
    }
  },
  methods: {
    updateYellowOption() {
      if (this.yellowAtOption === 'minutes') {
        this.yellowAtOption = 'percent';
      } else {
        this.yellowAtOption = 'minutes';
      }
    },
    updateYellowValue(value) {
      if (value > 100) {
        value = 100;
      }

      if (this.yellowAtOption === 'minutes') {
        this.yellowAtMinutes = parseInt(value);
      } else {
        this.yellowAtPercent = parseInt(value);
      }
    },
    save() {
      if (CSS.supports('color', this.backgroundColor)) {
        store.set('settings.backgroundColor', this.backgroundColor)
      }

      store.set('settings.backgroundColorOpacity', this.backgroundColorOpacity)

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
      store.set('settings.blackAtReset', this.blackAtReset)
      store.set('settings.stopTimerAtZero', this.stopTimerAtZero)
      store.set('settings.showHours', this.showHours)
      store.set('settings.pulseAtZero', this.pulseAtZero)
      store.set('settings.timerAlwaysOnTop', this.timerAlwaysOnTop)
      store.set('settings.yellowAtOption', this.yellowAtOption)
      store.set('settings.yellowAtMinutes', this.yellowAtMinutes)
      store.set('settings.yellowAtPercent', this.yellowAtPercent)

      store.set('settings.show', this.show)

      store.set('settings.font', this.font)

      this.$emit('settings-updated')
      ipcRenderer.send('settings-updated')

      this.$router.replace('/control/main')
    },
    addPreset() {
      this.presets.push(0)
    },
    deletePreset(index) {
      this.presets.splice(index, 1)
    },
    realTimeSettingUpdated() {
      let settings = {
        backgroundColorOpacity: this.backgroundColorOpacity,
      };

      ipcRenderer.send('temporary-settings-updated', settings);
    },
  }
}
</script>

<style scoped>
.min-h-color {
  min-height: 27px;
}
</style>
