<template>
  <BaseContainer>
    <TopBar>
      <timers-navigation>
        <timer-tab-button
          v-for="(timer, key) in settingsStore.settings.timers"
          @click="currentTimer = key as string"
          :active="currentTimer === key as string">
          {{ timer.name }}
        </timer-tab-button>
      </timers-navigation>
    </TopBar>
    <div class="countdown-tab p-1">
      <div class="flex gap-2">
        <card class="clock-setup justify-center">
          <div class="uppercase text-white">Set</div>
          <time-input @update:modelValue="timerControl.set(currentTimer, $event);" :modelValue="currentUpdate.setSeconds" color="white"/>
          <div class="uppercase mt-2 text-white flex flex-row justify-between">
            <span>Count</span>
            <div class="flex flex-row items-center gap-1">
              <play-pause-icon v-if="currentUpdate.timerEndsAt" class="w-6 h-6 inline-flex" />
              <span>{{ currentUpdate.timerEndsAt }}</span>
            </div>

          </div>
          <time-input :modelValue="currentUpdate.countSeconds" color="green" :disabled="true"/>
          <div class="uppercase mt-2 text-white">Extra</div>
          <time-input color="red" :modelValue="currentUpdate.extraSeconds" :disabled="true"/>
        </card>
        <Card class="control-buttons">
          <SButton class="text-4xl mb-2 font-mono uppercase" @click="timerControl.start(currentTimer)">Start</SButton>
          <SButton
            :disabled="currentUpdate.isReset"
            class="text-4xl mb-2 font-mono uppercase"
            type="warning"
            @click="timerControl.toggle(currentTimer)"
          >
            {{ currentUpdate.isRunning ? "Pause" : "Resume" }}
          </SButton>
          <SButton
            class="text-4xl mb-2 font-mono uppercase"
            type="danger"
            @click="timerControl.reset(currentTimer)"
          >
            Reset
          </SButton>
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
        </Card>
        <Card class="flex-1">
          <div class="uppercase text-white">Message</div>
          <div class="flex gap-2">
            <input-with-button type="text" @input="value => message = value" :model-value="message" @click="sendMessage">Send</input-with-button>
            <button @click="deleteMessage" class="mt-1 relative inline-flex items-center space-x-2 px-2 py-1 border border-red-600 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-500 focus:outline-none focus:ring-1 focus:ring-red-400 focus:border-red-500">
              <trash-icon class="w-5 h-5 inline-flex" />
            </button>
          </div>
        </Card>
      </div>
      <Card class="presets inline-flex gap-2 overflow-x-auto">
        <SButton
          v-for="(preset, index) in settingsStore.settings.presets"
          :key="index" type="info"
          @click="setPresetTime(preset)"
        >
          {{ preset }}
        </SButton>
      </Card>
    </div>
  </BaseContainer>
</template>

<script lang="ts" setup>
import {computed, nextTick, onBeforeMount, onMounted, ref, watch} from 'vue'
import {ipcRenderer} from 'electron'
import Card from '../components/Card.vue'
import SButton from '../components/SButton.vue'
import TimeInput from '../components/TimeInput.vue'
import Jog from "../components/Jog.vue";
import { PlayPauseIcon, PlusIcon, MinusIcon, TrashIcon } from '@heroicons/vue/24/outline';
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import {TimerControl} from "../TimerControl";
import Display = Electron.Display;
import InputWithButton from "../components/InputWithButton.vue";
import {Howl} from "howler";
import {CountdownSettings, DEFAULT_STORE} from "../../common/config";
import TimerTabButton from "../components/TimerTabButton.vue";
import TimersNavigation from "../components/TimersNavigation.vue";
import {useTimersStore} from '../stores/timers.ts'
import TopBar from '../components/TopBar.vue'
import BaseContainer from '../components/BaseContainer.vue'
import {useSettingsStore} from '../stores/settings.ts'

dayjs.extend(duration)
const timerControl = new TimerControl();

defineOptions({
  name: 'index',
});

let screens = ref<Display[]>([]);
const settingsStore = useSettingsStore()
let settings = ref<CountdownSettings>(DEFAULT_STORE.defaults.settings);
const timersStore = useTimersStore()
let message = ref('');
let lastMessage = ref('');

const currentTimer = ref<string|null>(null)
const currentUpdate = computed(() => {
  return timersStore.updates[currentTimer.value] ?? {
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
  }
})

function sendMessage() {
  timerControl.sendMessage(currentTimer.value, message.value);
  lastMessage.value = message.value;
}

const deleteMessage = () => {
  timerControl.sendMessage(currentTimer.value, '');
  message.value = '';
}

watch(() => settingsStore.settings.timers, (timers) => {
  if (currentTimer.value === undefined) {
    const firstTimer = Object.keys(timers)[0]
    currentTimer.value = firstTimer
  }
})

onMounted(async () => {
  const firstTimer = Object.keys(settingsStore.settings.timers)[0]
  currentTimer.value = firstTimer

  settings.value = await ipcRenderer.invoke('settings:get')
  screens.value = await ipcRenderer.invoke('screens:get');

  ipcRenderer.on('screens-updated', async () => {
    screens.value = await ipcRenderer.invoke('screens:get');
  })

  ipcRenderer.on('audio:play', async (event, audioFile, mimeType) => {
    const sound = new Howl({
      src: `data:${mimeType};base64,${audioFile}`,
    });

    sound.play()
  })
});

function jogMinutes(minutes: number) {
  if (!currentUpdate.value.isReset) {
    timerControl.jogCurrent(currentTimer.value, minutes * 60);
  } else {
    timerControl.jogSet(currentTimer.value, minutes * 60);
  }
}

function setPresetTime(minutes: number) {
  const secondsPerMinute = 60;
  timerControl.set(currentTimer.value, minutes * secondsPerMinute);
}

</script>

<style scoped>

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

</style>
