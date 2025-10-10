<template>
  <BaseContainer>
    <CreateTimerModal @create="createTimer" v-model:open="createModalOpen" />
    <TopBar>
      <TimersNavigation>
        <TimerTabButton
          v-for="(timer, key) in timers"
          @click="currentTimer = key as string"
          :active="currentTimer === key">
          {{ timer.name }}
        </TimerTabButton>
      </TimersNavigation>
      <button @click="createModalOpen = true" class="relative min-w-0 overflow-hidden font-normal text-white bg-green-500 py-0.5 px-1 text-sm text-center hover:bg-green-600 focus:z-10 rounded-lg"><PlusIcon class="h-6" /></button>
      <template v-slot:right>
        <SButton :disabled="Object.keys(timers).length < 2" tiny type="danger" @click="deleteOpen = true"><TrashIcon class="w-5"/></SButton>
      </template>
    </TopBar>
    <div v-if="timers[currentTimer]" class="mt-1 flex flex-1 flex-col gap-2 p-1 min-h-0 text-white overflow-y-scroll">
      <Card class="inline-flex flex-col gap-2">
        <div class="inline-flex flex-row items-center gap-10 justify-between">
          <CheckBox id="stopTimerAtZero" v-model="timers[currentTimer].stopTimerAtZero">Stop timer at 0</CheckBox>
          <CheckBox id="setTimeLive" v-model="timers[currentTimer].setTimeLive">Set time live</CheckBox>
          <div class="flex flex-row gap-2 items-center">
            <span class="text-sm">Bar turns yellow at</span>
            <input-with-button
              @click="updateYellowOption(currentTimer)"
              @input="updateYellowValue($event.target.value, currentTimer)"
              type="number"
              :model-value="timers[currentTimer].yellowAtOption === 'minutes' ? timers[currentTimer].yellowAtMinutes : timers[currentTimer].yellowAtPercent">
              {{ timers[currentTimer].yellowAtOption === 'minutes' ? 'm' : '%' }} <arrows-right-left-icon class="ml-3 w-4 h-4" />
            </input-with-button>
          </div>
          <div class="inline-flex flex-row gap-2 items-center">
            <p class="text-sm">Ms per second</p>
            <input class="input rounded-lg text-center px-2 sm:text-sm border-gray-300 w-24" type="number" @input="(event) => timers[currentTimer].timerDuration = parseInt(event.target.value)" :value="timers[currentTimer].timerDuration">
          </div>
        </div>
        <div>
          <div class="text-sm flex gap-3 items-center flex-row mt-3 mb-1">
            <div class="flex items-center gap-1">
              Audio:
              <SButton :disabled="!timers[currentTimer].audioFile" tiny type="danger" @click="timers[currentTimer].audioFile = null"><TrashIcon class="w-5"/></SButton>
              <SButton tiny @click="selectFile">Select file</SButton>
            </div>
            <div class="flex-1 break-words">Current: {{ timers[currentTimer].audioFile }}</div>
          </div>
        </div>
      </Card>
      <div class="h-[40vh]">
        <ScreensDrag :screens="screens" v-model:windows="timers[currentTimer].windows" />
      </div>
      <div class="flex flex-row justify-end">
        <button title="Add window" @click="createWindow" class="relative min-w-0 overflow-hidden font-normal text-white bg-green-500 py-0.5 px-1 text-sm text-center hover:bg-green-600 focus:z-10 rounded-lg"><PlusIcon class="h-6" /></button>
      </div>
      <div class="flex flex-col gap-2">
        <Card class="inline-flex gap-2 items-end" v-for="(window, key, index) in timers[currentTimer].windows">
          <span class="self-center text-2xl text-center min-w-8 rounded-lg bg-blue-500">{{ index + 1 }}</span>
          <div class="inline-flex flex-col">
            <p class="text-base">Fullscreen on screen</p>
            <select v-model="window.bounds.fullscreenOn" class="input p-2">
              <option :value="null">-</option>
              <option
                v-for="(screen, index) in screens"
                :key="screen.id"
                :value="screen.id"
              >
                Screen {{ index }}
                ({{ screen.size.width }}x{{ screen.size.height }}{{ screen.internal ? " Internal" : "" }})
              </option>
            </select>
          </div>
          <div class="inline-flex flex-col">
            <p class="text-base">X</p>
            <input
              :value="window.bounds.x"
              @input="window.bounds.x = $event.target.value !== '' ? parseInt($event.target.value) : 0"
              type="number" class="input w-20 rounded-lg px-2 sm:text-sm">
          </div>
          <div class="inline-flex flex-col">
            <p class="text-base">Y</p>
            <input
              :value="window.bounds.y"
              @input="window.bounds.y = $event.target.value !== '' ? parseInt($event.target.value) : 0"
              type="number" class="input w-20 rounded-lg px-2 sm:text-sm">
          </div>
          <div class="inline-flex flex-col">
            <p class="text-base">Width</p>
            <input
              :value="window.bounds.width"
              @input="window.bounds.width = $event.target.value !== '' ? parseInt($event.target.value) : 0"
              type="number" class="input w-20 rounded-lg px-2 sm:text-sm">
          </div>
          <div class="inline-flex flex-col">
            <p class="text-base">Height</p>
            <input
              :value="window.bounds.height"
              @input="window.bounds.height = $event.target.value !== '' ? parseInt($event.target.value) : 0"
              type="number" class="input w-20 px-2 sm:text-sm">
          </div>
          <SButton title="Save current position and size of window" class="inline-flex" tiny type="info" @click="getWindowBounds(key as string)"><ArrowUturnLeftIcon class="w-5" /><WindowIcon class="w-5" /> </SButton>
          <div class="inline-flex ml-auto flex-row gap-2">
            <SButton title="Settings" tiny type="info" @click="editWindow(key as string)"><CogIcon class="w-5" /></SButton>
            <SButton title="Delete" tiny type="danger"
                     @click="removeWindow(key as string)"
                     :disabled="Object.keys(timers[currentTimer].windows).length < 2"><TrashIcon class="w-5" /></SButton>
          </div>
        </Card>
      </div>
    </div>
    <div class="flex flex-row justify-end text-white bg-zinc-800 px-1 py-1 -mb-1 -mx-2">
      <div>
        <input :value="currentTimer" readonly type="text" @click="clipboard.writeText(currentTimer);" class="input text-center w-[18.5rem]" />
      </div>
    </div>
    <EditTimerModal v-model:window="editingWindow" v-model:window-id="editingWindowId" />
    <DeleteTimerModal v-model:open="deleteOpen" @delete="deleteTimer" :timer-name="timers[currentTimer]?.name ?? null" :timer-id="currentTimer" />
  </BaseContainer>
</template>

<script setup lang="ts">
import {computed, onBeforeMount, ref} from 'vue'
import {DEFAULT_TIMER_SETTINGS, DEFAULT_WINDOW_SETTINGS} from '../../common/config.ts'
import TimersNavigation from "../components/TimersNavigation.vue";
import TimerTabButton from "../components/TimerTabButton.vue";
import Card from "../components/Card.vue";
import InputWithButton from "../components/InputWithButton.vue";
import {ArrowsRightLeftIcon, PlusIcon, TrashIcon, WindowIcon, ArrowUturnLeftIcon, CogIcon, ClipboardIcon} from "@heroicons/vue/20/solid";
import CheckBox from "../components/CheckBox.vue";
import TopBar from '../components/TopBar.vue'
import BaseContainer from '../components/BaseContainer.vue'
import {useSettingsStore} from '../stores/settings.ts'
import CreateTimerModal from '../components/CreateTimerModal.vue'
import ScreensDrag from '../components/ScreensDrag.vue'
import {ipcRenderer} from 'electron'
import SButton from '../components/SButton.vue'
import EditTimerModal from '../components/EditTimerModal.vue'
import {ulid} from 'ulid'
import DeleteTimerModal from '../components/DeleteTimerModal.vue'
import {clipboard} from 'electron'

const screens = ref<Electron.Display[]>([])
const settingsStore = useSettingsStore()
const timers = computed(() => settingsStore.settings.timers)
const currentTimer = ref<string|null>(null)
const createModalOpen = ref<boolean>(false)
const editingWindowId = ref<string|null>(null)
const editingWindow = computed(() => {
  if (editingWindowId.value === null) {
    return null
  }
  return timers.value[currentTimer.value].windows[editingWindowId.value]
})
const deleteOpen = ref(false)

onBeforeMount(async () => {
  screens.value = await ipcRenderer.invoke('screens:get')

  ipcRenderer.on('screens-updated', async () => {
    screens.value = await ipcRenderer.invoke('screens:get');
  })

  const firstTimer = Object.keys(settingsStore.settings.timers)[0]
  currentTimer.value = firstTimer
})

const updateYellowOption = (timerId: string) => {
  if (timers.value[timerId].yellowAtOption === 'minutes') {
    timers.value[timerId].yellowAtOption = 'percent';
  } else {
    timers.value[timerId].yellowAtOption = 'minutes';
  }
}

const updateYellowValue = (value: number, timerId: string) => {
  if (value > 100) {
    value = 100;
  }

  if (timers.value[timerId].yellowAtOption === 'minutes') {
    timers.value[timerId].yellowAtMinutes = value;
  } else {
    timers.value[timerId].yellowAtPercent = value;
  }
}

const createTimer = (name: string) => {
  timers.value[ulid()] = {
    ...DEFAULT_TIMER_SETTINGS,
    ...{
      name,
      windows: {
        [ulid()]: DEFAULT_WINDOW_SETTINGS
      }
    }
  }
}

const selectFile = async () => {
  const file = await ipcRenderer.invoke('audio:select-file')
  if (file) {
    timers.value[currentTimer.value].audioFile = file
  }
}

const createWindow = () => {
  timers.value[currentTimer.value].windows[ulid()] = structuredClone(DEFAULT_WINDOW_SETTINGS)
}

const getWindowBounds = async (windowId: string) => {
  timers.value[currentTimer.value].windows[windowId].bounds = await ipcRenderer.invoke('countdown-bounds', currentTimer.value, windowId)
}

const editWindow = (windowId: string) => {
  editingWindowId.value = windowId
}

const removeWindow = (windowId: string) => {
  delete timers.value[currentTimer.value].windows[windowId]
}

const deleteTimer = (timerId: string) => {
  delete timers.value[timerId]
}
</script>

<style scoped>

</style>
