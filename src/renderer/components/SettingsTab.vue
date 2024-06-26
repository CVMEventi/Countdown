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
      <p class="text-sm mt-2">Content at Reset</p>
      <select v-model="settings.contentAtReset" class="input p-2 text-black">
        <option :value="ContentAtReset.Empty">Empty</option>
        <option :value="ContentAtReset.Time">Time</option>
        <option :value="ContentAtReset.Full">Full</option>
      </select>
      <p class="text-sm mt-2">Milliseconds per second</p>
      <input class="text-black focus:ring-indigo-500 focus:border-indigo-500 block rounded-md w-full text-center px-2 sm:text-sm border-gray-300" type="number" @input="(event) => settings.timerDuration = parseInt(event.target.value)" :value="settings.timerDuration">
    </card>
    <card class="inline-block border flex flex-col">
      <p class="text-2xl">Timer UI</p>
      <check-box id="showTimer" v-model="settings.show.timer">Timer</check-box>
      <check-box id="showProgress" v-model="settings.show.progress">Progress</check-box>
      <check-box id="showClock" v-model="settings.show.clock">Clock</check-box>
      <check-box id="showSecondsOnClock" v-model="settings.show.secondsOnClock">Seconds on clock</check-box>
      <check-box id="messageBoxFixedHeight" v-model="settings.messageBoxFixedHeight">Message box fixed height</check-box>
      <check-box id="use12HourClock" v-model="settings.use12HourClock">12-Hour Clock</check-box>
    </card>
    <card class="inline-block border flex flex-col">
      <div class="flex flex-col" style="min-width: 220px">
        <p class="text-2xl">Colors</p>
        <color-input alpha-channel v-model="settings.backgroundColor" default-value="#000000ff">
          Background
        </color-input>
        <color-input alpha-channel v-model="settings.resetBackgroundColor" default-value="#000000ff">
          Background at reset
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
        <hr class="mt-4 -mx-3 border-t-2"/>
        <p class="text-2xl mt-3">Close action</p>
        <select v-model="settings.closeAction" class="input p-2 text-black">
          <option v-for="action in CloseAction" :value="action">{{ getCloseActionLabel(action) }}</option>
        </select>
        <check-box id="startHidden" v-model="settings.startHidden">Start hidden</check-box>
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
  ContentAtReset,
  DEFAULT_CONTENT_AT_RESET,
  DEFAULT_RESET_BACKGROUND_COLOR,
  DEFAULT_USE_12_HOUR_CLOCK, DEFAULT_CLOSE_ACTION, DEFAULT_START_HIDDEN,

} from "../../common/config";
import CheckBox from "./CheckBox";
import EditPreset from "./EditPreset";
import debounce from "debounce";
import Display = Electron.Display;
import {CloseAction} from "../../common/config";

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
  resetBackgroundColor: store.get('settings.resetBackgroundColor', DEFAULT_RESET_BACKGROUND_COLOR),
  textColor: store.get('settings.textColor', DEFAULT_TEXT_COLOR),
  timerFinishedTextColor: store.get('settings.timerFinishedTextColor', DEFAULT_TIMER_FINISHED_TEXT_COLOR),
  clockColor: store.get('settings.clockColor', DEFAULT_CLOCK_COLOR),
  clockTextColor: store.get('settings.clockTextColor', DEFAULT_CLOCK_TEXT_COLOR),
  presets: store.get('settings.presets', DEFAULT_PRESETS),
  stopTimerAtZero: store.get('settings.stopTimerAtZero', DEFAULT_STOP_TIMER_AT_ZERO),
  showHours: store.get('settings.showHours', DEFAULT_SHOW_HOURS),
  pulseAtZero: store.get('settings.pulseAtZero', DEFAULT_PULSE_AT_ZERO),
  show: store.get('settings.show', DEFAULT_SHOW_SECTIONS),
  timerAlwaysOnTop: store.get('settings.timerAlwaysOnTop', DEFAULT_TIMER_ALWAYS_ON_TOP),
  yellowAtOption: store.get('settings.yellowAtOption', DEFAULT_YELLOW_AT_OPTION),
  yellowAtMinutes: store.get('settings.yellowAtMinutes', DEFAULT_YELLOW_AT_MINUTES),
  yellowAtPercent: store.get('settings.yellowAtPercent', DEFAULT_YELLOW_AT_PERCENT),
  audioEnabled: store.get('settings.audioEnabled', DEFAULT_AUDIO_ENABLED),
  timerDuration: store.get('settings.timerDuration', DEFAULT_TIMER_DURATION),
  setTimeLive: store.get('settings.setTimeLive', DEFAULT_SET_TIME_LIVE),
  use12HourClock: store.get('settings.use12HourClock', DEFAULT_USE_12_HOUR_CLOCK),
  messageBoxFixedHeight: store.get('settings.messageBoxFixedHeight', DEFAULT_MESSAGE_BOX_FIXED_HEIGHT),
  contentAtReset: store.get('settings.contentAtReset', DEFAULT_CONTENT_AT_RESET),
  closeAction: store.get('settings.closeAction', DEFAULT_CLOSE_ACTION),
  startHidden: store.get('settings.startHidden', DEFAULT_START_HIDDEN),
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
    stopTimerAtZero: settings.value.stopTimerAtZero,
    showHours: settings.value.showHours,
    pulseAtZero: settings.value.pulseAtZero,
    timerAlwaysOnTop: settings.value.timerAlwaysOnTop,
    yellowAtOption: settings.value.yellowAtOption,
    yellowAtMinutes: settings.value.yellowAtMinutes,
    yellowAtPercent: settings.value.yellowAtPercent,
    show: settings.value.show,
    audioEnabled: settings.value.audioEnabled,
    timerDuration: settings.value.timerDuration,
    setTimeLive: settings.value.setTimeLive,
    use12HourClock: settings.value.use12HourClock,
    messageBoxFixedHeight: settings.value.messageBoxFixedHeight,
    contentAtReset: settings.value.contentAtReset,
    closeAction: settings.value.closeAction,
    startHidden: settings.value.startHidden,
  }

  if (CSS.supports('color', settings.value.backgroundColor)) {
    newSettings.backgroundColor = settings.value.backgroundColor;
  }

  if (CSS.supports('color', settings.value.resetBackgroundColor)) {
    newSettings.resetBackgroundColor = settings.value.resetBackgroundColor;
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
}, 200, {immediate: false});

function addPreset() {
  settings.value.presets.push(0)
}

function deletePreset(index: number) {
  settings.value.presets.splice(index, 1)
}

function getCloseActionLabel(closeAction: CloseAction): string {
  const labels = {
    'ASK': 'Ask',
    'HIDE': 'Hide',
    'CLOSE': 'Quit',
  }

  return labels[closeAction]
}
</script>

<style scoped>
.min-h-color {
  min-height: 27px;
}
</style>
