<template>
  <div class="flex flex-1 gap-2 p-1 min-h-0 text-white">
    <card class="inline-block border flex flex-col p-0">
      <p class="text-2xl">Presets (m)</p>
      <draggable item-key="index" v-model="settings.presets" handle=".handle"
                 class="flex flex-col gap-2 overflow-y-scroll items-center pb-1">
        <template #item="{element, index}">
          <div :key="index" class="inline-block w-[140px]">
            <edit-preset v-model="settings.presets[index]" @delete="deletePreset(index)"></edit-preset>
          </div>
        </template>
      </draggable>
      <s-button tiny class="m-3" type="info" @click="addPreset">Add</s-button>
    </card>
    <card class="inline-block border flex flex-col">
      <p class="text-2xl">Timer</p>
      <check-box id="blackAtReset" v-model="settings.blackAtReset">Black at reset</check-box>
      <check-box id="stopTimerAtZero" v-model="settings.stopTimerAtZero">Stop timer at 0</check-box>
      <check-box id="showHours" v-model="settings.showHours">Show hours</check-box>
      <check-box id="pulseAtZero" v-model="settings.pulseAtZero">Pulse at zero</check-box>
      <check-box id="timerAlwaysOnTop" v-model="settings.timerAlwaysOnTop">Window always on top</check-box>
      <check-box id="setTimeLive" v-model="settings.setTimeLive">Set time live</check-box>
      <p class="text-sm mt-2">Yellow Bar at</p>
      <input-with-button
        @click="updateYellowOption"
        @input="updateYellowValue"
        type="number"
        :model-value="settings.yellowAtOption === 'minutes' ? settings.yellowAtMinutes : settings.yellowAtPercent">
        {{ settings.yellowAtOption === 'minutes' ? 'm' : '%' }} <arrows-right-left-icon class="ml-3 w-4 h-4" />
      </input-with-button>
    </card>
    <card class="inline-block border flex flex-col">
      <p class="text-2xl">Timer UI</p>
      <check-box id="showTimer" v-model="settings.show.timer">Timer</check-box>
      <check-box id="showProgress" v-model="settings.show.progress">Progress</check-box>
      <check-box id="showClock" v-model="settings.show.clock">Clock</check-box>
      <check-box id="showSecondsOnClock" v-model="settings.show.secondsOnClock">Seconds on clock</check-box>
      <check-box id="messageBoxFixedHeight" v-model="settings.messageBoxFixedHeight">Message box fixed height</check-box>
      <p class="text-2xl">Audio</p>
      <check-box id="audioEnabled" v-model="settings.audioEnabled">Enable</check-box>
    </card>
    <card class="inline-block border flex flex-col">
      <div class="flex flex-col" style="min-width: 220px">
        <p class="text-2xl">Colors</p>
        <color-input alpha-channel v-model="settings.backgroundColor" default-value="#000000ff">
          Background
        </color-input>
        <color-input v-model="settings.textColor" default-value="#ffffff">
          Text
        </color-input>
        <color-input v-model="settings.timerFinishedTextColor" default-value="#ff0000">
          Text on timer finished
        </color-input>
        <color-input v-model="settings.clockColor" default-value="#ffffff">
          Clock
        </color-input>
        <color-input v-model="settings.clockTextColor" default-value="#ffffff">
          Clock Text
        </color-input>
        <p class="text-2xl mt-3">Font</p>
        <select v-model="settings.font" class="input p-2 text-black">
          <option value="digital-7">digital-7</option>
          <option value="B612">B612</option>
          <option value="Xanh">Xanh</option>
        </select>
        <p class="text-sm mt-2">Milliseconds per second</p>
        <input class="text-black focus:ring-indigo-500 focus:border-indigo-500 block rounded-md w-full text-center px-2 sm:text-sm border-gray-300" type="number" @input="(event) => settings.timerDuration = parseInt(event.target.value)" :value="settings.timerDuration">
      </div>
    </card>
  </div>
</template>

<script lang="ts" setup>
import {computed, defineComponent, ref, watch} from "vue";
import {ArrowsRightLeftIcon} from "@heroicons/vue/20/solid";
import Store from 'electron-store'
import {ipcRenderer} from 'electron'
import draggable from 'vuedraggable'
import Card from './Card'
import ColorInput from './ColorInput'
import SButton from './SButton'
import InputWithButton from "./InputWithButton";
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
  DEFAULT_SHOW_SECTIONS,
  DEFAULT_BLACK_AT_RESET,
  DEFAULT_FONT,
  DEFAULT_TIMER_ALWAYS_ON_TOP,
  DEFAULT_YELLOW_AT_OPTION,
  DEFAULT_YELLOW_AT_MINUTES,
  DEFAULT_YELLOW_AT_PERCENT,
  DEFAULT_SET_TIME_LIVE,
  DEFAULT_AUDIO_ENABLED,
  DEFAULT_STORE,
  CountdownSettings,
  DEFAULT_TIMER_DURATION,
  CountdownStore,
  DEFAULT_MESSAGE_BOX_FIXED_HEIGHT,

} from "../../common/config";
import CheckBox from "./CheckBox";
import EditPreset from "./EditPreset";
import {debounce} from "debounce";
import Display = Electron.Display;

defineOptions({
  name: 'SettingsTab',
});

export interface Props {
  screens: Display[]
  selectedScreen: Display
}

const props = withDefaults(defineProps<Props>(), {
  screens: () => [],
  selectedScreen: null,
})

const emit = defineEmits<{
  'settings-updated': [],
}>();

const store = new Store<CountdownStore>(DEFAULT_STORE);

let settings = ref({
  backgroundColor: store.get('settings.backgroundColor', DEFAULT_BACKGROUND_COLOR),
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
  audioEnabled: store.get('settings.audioEnabled', DEFAULT_AUDIO_ENABLED),
  timerDuration: store.get('settings.timerDuration', DEFAULT_TIMER_DURATION),
  setTimeLive: store.get('settings.setTimeLive', DEFAULT_SET_TIME_LIVE),
  messageBoxFixedHeight: store.get('settings.messageBoxFixedHeight', DEFAULT_MESSAGE_BOX_FIXED_HEIGHT),
});

watch(settings, () => {
  save();
}, {deep: true});

function updateYellowOption() {
  if (settings.value.yellowAtOption === 'minutes') {
    settings.value.yellowAtOption = 'percent';
  } else {
    settings.value.yellowAtOption = 'minutes';
  }
}

function updateYellowValue(value: number) {
  if (value > 100) {
    value = 100;
  }

  if (settings.value.yellowAtOption === 'minutes') {
    settings.value.yellowAtMinutes = value;
  } else {
    settings.value.yellowAtPercent = value;
  }
}

const save = debounce(() => {
  let oldSettings = store.get('settings', DEFAULT_STORE.defaults.settings);

  let newSettings: CountdownSettings = {
    ...oldSettings,
    presets: settings.value.presets,
    blackAtReset: settings.value.blackAtReset,
    stopTimerAtZero: settings.value.stopTimerAtZero,
    showHours: settings.value.showHours,
    pulseAtZero: settings.value.pulseAtZero,
    timerAlwaysOnTop: settings.value.timerAlwaysOnTop,
    yellowAtOption: settings.value.yellowAtOption,
    yellowAtMinutes: settings.value.yellowAtMinutes,
    yellowAtPercent: settings.value.yellowAtPercent,
    show: settings.value.show,
    font: settings.value.font,
    audioEnabled: settings.value.audioEnabled,
    timerDuration: settings.value.timerDuration,
    setTimeLive: settings.value.setTimeLive,
    messageBoxFixedHeight: settings.value.messageBoxFixedHeight,
  }

  if (CSS.supports('color', settings.value.backgroundColor)) {
    newSettings.backgroundColor = settings.value.backgroundColor;
  }

  if (CSS.supports('color', settings.value.textColor)) {
    newSettings.textColor = settings.value.textColor;
  }

  if (CSS.supports('color', settings.value.timerFinishedTextColor)) {
    newSettings.timerFinishedTextColor = settings.value.timerFinishedTextColor;
  }

  if (CSS.supports('color', settings.value.clockColor)) {
    newSettings.clockColor = settings.value.clockColor;
  }

  if (CSS.supports('color', settings.value.clockTextColor)) {
    newSettings.clockTextColor = settings.value.clockTextColor;
  }

  store.set('settings', newSettings)

  emit('settings-updated')
  ipcRenderer.send('settings-updated')

  //this.$router.replace('/control/main')
}, 200, false);

function addPreset() {
  settings.value.presets.push(0)
}

function deletePreset(index: number) {
  settings.value.presets.splice(index, 1)
}
</script>

<style scoped>
.min-h-color {
  min-height: 27px;
}
</style>
