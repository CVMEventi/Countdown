<template>
  <div v-if="settings.timers[0]" class="flex flex-1 gap-2 p-1 min-h-0 text-white">
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
      <check-box id="stopTimerAtZero" v-model="settings.timers[0].stopTimerAtZero">Stop timer at 0</check-box>
      <check-box id="showHours" v-model="settings.timers[0].windows[0].show.hours">Show hours</check-box>
      <check-box id="pulseAtZero" v-model="settings.timers[0].windows[0].pulseAtZero">Pulse at zero</check-box>
      <check-box id="timerAlwaysOnTop" v-model="settings.timers[0].windows[0].alwaysOnTop">Window always on top</check-box>
      <check-box id="setTimeLive" v-model="settings.timers[0].setTimeLive">Set time live</check-box>
      <p class="text-sm mt-2">Yellow Bar at</p>
      <input-with-button
        @click="updateYellowOption(0)"
        @input="updateYellowValue(+$event, 0)"
        type="number"
        :model-value="settings.timers[0].yellowAtOption === 'minutes' ? settings.timers[0].yellowAtMinutes : settings.timers[0].yellowAtPercent">
        {{ settings.timers[0].yellowAtOption === 'minutes' ? 'm' : '%' }} <arrows-right-left-icon class="ml-3 w-4 h-4" />
      </input-with-button>
      <p class="text-sm mt-2">Content at Reset</p>
      <select v-model="settings.timers[0].windows[0].contentAtReset" class="input p-2 text-black">
        <option :value="ContentAtReset.Empty">Empty</option>
        <option :value="ContentAtReset.Time">Time</option>
        <option :value="ContentAtReset.Full">Full</option>
      </select>
      <p class="text-sm mt-2">Milliseconds per second</p>
      <input class="text-black focus:ring-indigo-500 focus:border-indigo-500 block rounded-md w-full text-center px-2 sm:text-sm border-gray-300" type="number" @input="(event) => settings.timers[0].timerDuration = parseInt(event.target.value)" :value="settings.timers[0].timerDuration">
    </card>
    <card class="inline-block border flex flex-col">
      <p class="text-2xl">Timer UI</p>
      <check-box id="showTimer" v-model="settings.timers[0].windows[0].show.timer">Timer</check-box>
      <check-box id="showProgress" v-model="settings.timers[0].windows[0].show.progress">Progress</check-box>
      <check-box id="showClock" v-model="settings.timers[0].windows[0].show.clock">Clock</check-box>
      <check-box id="showSecondsOnClock" v-model="settings.timers[0].windows[0].show.secondsOnClock">Seconds on clock</check-box>
      <check-box id="messageBoxFixedHeight" v-model="settings.timers[0].windows[0].messageBoxFixedHeight">Message box fixed height</check-box>
      <check-box id="use12HourClock" v-model="settings.timers[0].windows[0].use12HourClock">12-Hour Clock</check-box>
      <hr class="mt-4 -mx-3 border-t-2"/>
      <p class="text-2xl mt-3">Audio</p>
      <s-button @click="selectFile">Select file</s-button>
      <div class="max-w-[200px] break-words">Current: {{ settings.timers[0].audioFile }}</div>
    </card>
    <card class="inline-block border flex flex-col">
      <div class="flex flex-col" style="min-width: 220px">
        <p class="text-2xl">Colors</p>
        <color-input :alpha-channel="true" v-model="settings.timers[0].windows[0].colors.background" default-value="#000000ff">
          Background
        </color-input>
        <color-input :alpha-channel="true" v-model="settings.timers[0].windows[0].colors.resetBackground" default-value="#000000ff">
          Background at reset
        </color-input>
        <color-input v-model="settings.timers[0].windows[0].colors.text" default-value="#ffffff">
          Text
        </color-input>
        <color-input v-model="settings.timers[0].windows[0].colors.timerFinishedText" default-value="#ff0000">
          Text on timer finished
        </color-input>
        <color-input v-model="settings.timers[0].windows[0].colors.clock" default-value="#ffffff">
          Clock
        </color-input>
        <color-input v-model="settings.timers[0].windows[0].colors.clockText" default-value="#ffffff">
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
import {computed, defineComponent, onBeforeMount, ref, watch} from "vue";
import {ArrowsRightLeftIcon} from "@heroicons/vue/20/solid";
import {ipcRenderer} from 'electron'
import draggable from 'vuedraggable'
import Card from './Card.vue'
import ColorInput from './ColorInput.vue'
import SButton from './SButton.vue'
import InputWithButton from "./InputWithButton.vue";
import {
  CountdownSettings,
  ContentAtReset,
  DEFAULT_CLOSE_ACTION, DEFAULT_START_HIDDEN,
  DEFAULT_REMOTE_SETTINGS,
} from "../../common/config";
import CheckBox from "./CheckBox.vue";
import EditPreset from "./EditPreset.vue";
import Display = Electron.Display;
import {CloseAction} from "../../common/config";
import {watchIgnorable, useDebounceFn} from "@vueuse/core";

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

let settings = ref<CountdownSettings>({
  presets: [],
  remote: DEFAULT_REMOTE_SETTINGS,
  setWindowAlwaysOnTop: false,
  closeAction: DEFAULT_CLOSE_ACTION,
  startHidden: DEFAULT_START_HIDDEN,
  timers: [],
});

const { stop, ignoreUpdates } = watchIgnorable(settings, () => {
  save();
}, {deep: true});

function updateYellowOption(timerId = 0) {
  if (settings.value.timers[timerId].yellowAtOption === 'minutes') {
    settings.value.timers[timerId].yellowAtOption = 'percent';
  } else {
    settings.value.timers[timerId].yellowAtOption = 'minutes';
  }
}

function updateYellowValue(value: number, timerId: number = 0) {
  if (value > 100) {
    value = 100;
  }

  if (settings.value.timers[timerId].yellowAtOption === 'minutes') {
    settings.value.timers[timerId].yellowAtMinutes = value;
  } else {
    settings.value.timers[timerId].yellowAtPercent = value;
  }
}

const save = useDebounceFn(async () => {
  await ipcRenderer.invoke('settings:set', null, JSON.stringify(settings.value))
  emit('settings-updated')
  ipcRenderer.send('settings-updated')
}, 200);

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

const selectFile = async () => {
  const file = await ipcRenderer.invoke('audio:select-file')
  if (file) {
    settings.value.timers[0].audioFile = file
  }
}

onBeforeMount(async () => {
  const newSettings = await ipcRenderer.invoke('settings:get')
  ignoreUpdates(() => {
    settings.value = newSettings
  })
})
</script>

<style scoped>
.min-h-color {
  min-height: 27px;
}
</style>
