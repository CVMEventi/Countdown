<template>
  <BaseContainer>
    <TopBar>
      <TimersNavigation>
        <TimerTabButton
          v-for="(timer, key) in settingsStore.settings.timers"
          @click="globalStore.currentTimer = key as string"
          :active="globalStore.currentTimer === key as string">
          {{ timer.name }}
        </TimerTabButton>
      </TimersNavigation>
    </TopBar>
    <div class="countdown-tab p-1">
      <div class="flex gap-2">
        <Card class="clock-setup justify-center">
          <div class="uppercase text-white">Set</div>
          <TimeInput @update:modelValue="timerControl.set(globalStore.currentTimer, $event);" :modelValue="currentUpdate.setSeconds" color="white"/>
          <div class="uppercase mt-2 text-white flex flex-row justify-between">
            <span>Count</span>
            <div class="flex flex-row items-center gap-1">
              <play-pause-icon v-if="currentUpdate.timerEndsAt" class="w-6 h-6 inline-flex" />
              <span>{{ currentUpdate.timerEndsAt }}</span>
            </div>

          </div>
          <TimeInput :modelValue="currentUpdate.countSeconds" color="green" :disabled="true"/>
          <div class="uppercase mt-2 text-white">Extra</div>
          <TimeInput color="red" :modelValue="currentUpdate.extraSeconds" :disabled="true"/>
        </Card>
        <Card class="control-buttons">
          <SButton class="text-4xl mb-2 font-mono uppercase" @click="timerControl.start(globalStore.currentTimer)">Start</SButton>
          <SButton
            :disabled="currentUpdate.isReset"
            class="text-4xl mb-2 font-mono uppercase"
            type="warning"
            @click="timerControl.toggle(globalStore.currentTimer)"
          >
            {{ currentUpdate.isRunning ? "Pause" : "Resume" }}
          </SButton>
          <SButton
            class="text-4xl mb-2 font-mono uppercase"
            type="danger"
            @click="timerControl.reset(globalStore.currentTimer)"
          >
            Reset
          </SButton>
          <div class="flex gap-2 justify-center">
            <Jog class="w-18" @up-click="jogMinutes(1)" @down-click="jogMinutes(-1)">
              <template v-slot:up>
                <PlusIcon class="w-5 h-5 inline-flex"></PlusIcon>
              </template>
              <template v-slot:down>
                <MinusIcon class="w-5 h-5 inline-flex"></MinusIcon>
              </template>
              1m
            </Jog>
            <Jog class="w-18" @up-click="jogMinutes(5)" @down-click="jogMinutes(-5)">
              <template v-slot:up>
                <PlusIcon class="w-5 h-5 inline-flex"></PlusIcon>
              </template>
              <template v-slot:down>
                <MinusIcon class="w-5 h-5 inline-flex"></MinusIcon>
              </template>
              5m
            </Jog>
            <Jog class="w-18" @up-click="jogMinutes(10)" @down-click="jogMinutes(-10)">
              <template v-slot:up>
                <PlusIcon class="w-5 h-5 inline-flex"></PlusIcon>
              </template>
              <template v-slot:down>
                <MinusIcon class="w-5 h-5 inline-flex"></MinusIcon>
              </template>
              10m
            </Jog>
          </div>
        </Card>
        <Card class="flex-1">
          <div class="uppercase text-white">Message</div>
          <div class="flex gap-2">
            <InputWithButton class="h-8" type="text" @input="value => message = value" :model-value="message" @click="sendMessage">Send</InputWithButton>
            <SButton tiny type="danger" @click="deleteMessage">
              <TrashIcon class="w-5 h-5 inline-flex" />
            </SButton>
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
import {computed, onMounted, ref, watch} from 'vue'
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
// @ts-ignore
import {Howl} from "howler";
import TimerTabButton from "../components/TimerTabButton.vue";
import TimersNavigation from "../components/TimersNavigation.vue";
import {useTimersStore} from '../stores/timers.ts'
import TopBar from '../components/TopBar.vue'
import BaseContainer from '../components/BaseContainer.vue'
import {useSettingsStore} from '../stores/settings.ts'
import {useGlobalStore} from '../stores/global.ts'
import exports from 'webpack'

dayjs.extend(duration)
const timerControl = new TimerControl();

defineOptions({
  name: 'index',
});

let screens = ref<Display[]>([]);
const settingsStore = useSettingsStore()
const timersStore = useTimersStore()
const globalStore = useGlobalStore()
let message = ref('');
let lastMessage = ref('');

const currentUpdate = computed(() => {
  return timersStore.updates[globalStore.currentTimer] ?? {
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
  timerControl.sendMessage(globalStore.currentTimer, message.value);
  lastMessage.value = message.value;
}

const deleteMessage = () => {
  timerControl.sendMessage(globalStore.currentTimer, '');
  message.value = '';
}

watch(() => settingsStore.settings.timers, (timers) => {
  if (globalStore.currentTimer === undefined) {
    const firstTimer = Object.keys(timers)[0]
    globalStore.currentTimer = firstTimer
  }
})

onMounted(async () => {
  const firstTimer = Object.keys(settingsStore.settings.timers)[0]
  globalStore.currentTimer = firstTimer

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
    timerControl.jogCurrent(globalStore.currentTimer, minutes * 60);
  } else {
    timerControl.jogSet(globalStore.currentTimer, minutes * 60);
  }
}

function setPresetTime(minutes: number) {
  const secondsPerMinute = 60;
  timerControl.set(globalStore.currentTimer, minutes * secondsPerMinute);
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
