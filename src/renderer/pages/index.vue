<template>
  <div class="main-container flex flex-col bg-zinc-700">
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
          <time-input @update:modelValue="timerControl.set($event);" :modelValue="update.setSeconds" color="white"/>
          <div class="uppercase mt-2 text-white flex flex-row justify-between">
            <span>Count</span>
            <div class="flex flex-row items-center gap-1">
              <play-pause-icon v-if="update.timerEndsAt" class="w-6 h-6 inline-flex" />
              <span>{{ update.timerEndsAt }}</span>
            </div>

          </div>
          <time-input :modelValue="update.countSeconds" color="green" :disabled="true"/>
          <div class="uppercase mt-2 text-white">Extra</div>
          <time-input color="red" :modelValue="update.extraSeconds" :disabled="true"/>
        </card>
        <card class="control-buttons">
          <s-button class="text-4xl mb-2 font-mono uppercase" @click="timerControl.start">Start</s-button>
          <s-button
            :disabled="update.isReset"
            class="text-4xl mb-2 font-mono uppercase"
            type="warning"
            @click="timerControl.toggle"
          >
            {{ update.isRunning ? "Pause" : "Resume" }}
          </s-button>
          <s-button
            class="text-4xl mb-2 font-mono uppercase"
            type="danger"
            @click="timerControl.reset"
          >
            Reset
          </s-button>
          <div class="flex gap-2 justify-center">
            <jog @up-click="jogMinutes(1)" @down-click="jogMinutes(-1)">
              <template v-slot:up>
                <plus-icon class="w-5 h-5 inline-flex"></plus-icon>
              </template>
              <template v-slot:down>
                <minus-icon class="w-5 h-5 inline-flex"></minus-icon>
              </template>
              1m
            </jog>
            <jog @up-click="jogMinutes(5)" @down-click="jogMinutes(-5)">
              <template v-slot:up>
                <plus-icon class="w-5 h-5 inline-flex"></plus-icon>
              </template>
              <template v-slot:down>
                <minus-icon class="w-5 h-5 inline-flex"></minus-icon>
              </template>
              5m
            </jog>
            <jog @up-click="jogMinutes(10)" @down-click="jogMinutes(-10)">
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
      :screens="screens"
      :selected-screen="selectedScreen"
      @settings-updated="settingsUpdated"
    />
    <remote-tab
      v-if="tab === 'remote'"
      ref="remoteTabRef" />
    <windows-tab
      :screens="screens"
      v-if="tab === 'windows'"
    />
  </div>
</template>

<script lang="ts" setup>
import {computed, defineComponent, onMounted, ref} from "vue";
import {ipcRenderer} from 'electron'
import Store from "electron-store"
import Card from '../components/Card'
import SButton from '../components/SButton'
import TimeInput from '../components/TimeInput'
import TabButton from '../components/TabButton'
import SettingsTab from '../components/SettingsTab'
import WindowsTab from "../components/WindowsTab";
import Jog from "../components/Jog";
import { PlayPauseIcon, PlusIcon, MinusIcon } from '@heroicons/vue/24/outline';
import Navigation from "../components/Navigation";
import { shell } from "electron";
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
dayjs.extend(duration)
import RemoteTab from "../components/RemoteTab";
import {TimerEngineUpdate} from "../../common/TimerInterfaces";
import {TimerControl} from "../TimerControl";
import Display = Electron.Display;
import {CountdownSettings} from "../../common/config";
/*
import { Howl } from "howler";
import gong from "../assets/sounds/gong.mp3";
let sound = new Howl({
  src: [gong],
})
*/

let store = new Store()
const timerControl = new TimerControl(updateReceived);

defineOptions({
  name: 'index',
});

export interface Props {
  tab: string
}

const props = defineProps<Props>();

let externalContent = ref('');
let selectedScreen = ref(null);
let screens = ref<Display[]>([]);
let selectedTab = ref('countdown');
let settings = ref<CountdownSettings>(store.get('settings') as CountdownSettings);
let audioRun = false;
let update = ref<TimerEngineUpdate>({
  setSeconds: 0,
  countSeconds: 0,
  currentSeconds: 0,
  extraSeconds: 0,
  secondsSetOnCurrentTimer: 0,
  isCountingUp: false,
  isExpiring: false,
  isReset: true,
  isRunning: false,
  timerEndsAt: null,
});

onMounted(async () => {
  screens.value = await ipcRenderer.invoke('get-screens');

  ipcRenderer.on('screens-updated', async () => {
    screens.value = await ipcRenderer.invoke('get-screens');
  })
});

function jogMinutes(minutes: number) {
  if (!update.value.isReset) {
    timerControl.jogCurrent(minutes * 60);
  } else {
    timerControl.jogSet(minutes * 60);
  }
}

function updateReceived(newUpdate: TimerEngineUpdate) {
  update.value = newUpdate;
}

function setPresetTime(minutes: number) {
  const secondsPerMinute = 60;
  timerControl.set(minutes * secondsPerMinute);
}

function settingsUpdated() {
  store = new Store();
  settings.value = store.get('settings') as CountdownSettings;
}

function openURL(url: string) {
  shell.openExternal(url);
}

let remoteTabRef = ref<RemoteTab>();

function save() {
  if (props.tab === 'remote') {
    remoteTabRef.value.save()
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
