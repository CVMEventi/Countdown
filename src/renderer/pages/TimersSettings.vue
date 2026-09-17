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
    <div v-if="currentTimer && timers[currentTimer]" class="mt-1 flex flex-1 flex-row gap-2 p-1 min-h-0 text-white">
      <div class="w-72 shrink-0 min-h-0 overflow-y-auto">
        <TimerGeneralCard v-model="timers[currentTimer]" :timers="timers" :timer-id="currentTimer" />
      </div>
      <div class="flex flex-1 flex-col gap-2 min-w-0 min-h-0 overflow-y-auto">
        <div class="flex flex-row items-center justify-between">
          <p class="text-lg uppercase">Windows</p>
          <button title="Add window" @click="createWindow" class="relative min-w-0 overflow-hidden font-normal text-white bg-green-500 py-0.5 px-1 text-sm text-center hover:bg-green-600 focus:z-10 rounded-lg"><PlusIcon class="h-6" /></button>
        </div>
        <div class="h-[40vh] shrink-0">
          <ScreensDrag :screens="screens" v-model:windows="timers[currentTimer].windows" />
        </div>
        <div class="flex flex-col gap-2">
          <Card class="flex flex-wrap gap-2 items-end" v-for="(window, key, index) in timers[currentTimer].windows">
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
                  Screen {{ index + 1 }}
                  ({{ screen.size.width }}x{{ screen.size.height }}{{ screen.internal ? " Internal" : "" }})
                </option>
              </select>
            </div>
            <div class="inline-flex flex-col">
              <p class="text-base">X</p>
              <input
                :value="window.bounds.x"
                @input="window.bounds.x = $event.target.value !== '' ? parseInt($event.target.value) : 0"
                v-no-wheel type="number" class="input w-20 rounded-lg px-2 sm:text-sm">
            </div>
            <div class="inline-flex flex-col">
              <p class="text-base">Y</p>
              <input
                :value="window.bounds.y"
                @input="window.bounds.y = $event.target.value !== '' ? parseInt($event.target.value) : 0"
                v-no-wheel type="number" class="input w-20 rounded-lg px-2 sm:text-sm">
            </div>
            <div class="inline-flex flex-col">
              <p class="text-base">Width</p>
              <input
                :value="window.bounds.width"
                @input="window.bounds.width = $event.target.value !== '' ? parseInt($event.target.value) : 0"
                v-no-wheel type="number" class="input w-20 rounded-lg px-2 sm:text-sm">
            </div>
            <div class="inline-flex flex-col">
              <p class="text-base">Height</p>
              <input
                :value="window.bounds.height"
                @input="window.bounds.height = $event.target.value !== '' ? parseInt($event.target.value) : 0"
                v-no-wheel type="number" class="input w-20 px-2 sm:text-sm">
            </div>
            <div class="inline-flex ml-auto flex-row gap-2">
              <ShareTimerButton
                :is-in-browser="false"
                :addresses="webServerStore.addresses"
                :port="webServerStore.port"
                :server-running="webServerStore.isRunning"
                :timer-id="currentTimer"
                :window-id="key as string"
              />
              <SButton title="Hide/Show" tiny type="warning" @click="window.bounds.hidden = !window.bounds.hidden">
                <EyeIcon v-if="window.bounds.hidden" class="w-5" />
                <EyeSlashIcon v-if="!window.bounds.hidden" class="w-5" />
              </SButton>
              <SButton title="Settings" tiny type="info" @click="editWindow(key as string)"><CogIcon class="w-5" /></SButton>
              <SButton title="Delete" tiny type="danger"
                       @click="removeWindow(key as string)"
                       :disabled="Object.keys(timers[currentTimer].windows).length < 2"><TrashIcon class="w-5" /></SButton>
            </div>
          </Card>
        </div>
      </div>
    </div>
    <EditTimerModal v-model:window="editingWindow" v-model:window-id="editingWindowId" />
    <DeleteTimerModal v-model:open="deleteOpen" @delete="deleteTimer" :timer-name="timers[currentTimer!]?.name ?? null" :timer-id="currentTimer" />
  </BaseContainer>
</template>

<script setup lang="ts">
import {computed, onBeforeMount, ref} from 'vue'
import { DEFAULT_TIMER_SETTINGS, DEFAULT_WINDOW_SETTINGS, Timers } from '@common/config.ts'
import TimersNavigation from "@common/components/TimersNavigation.vue";
import TimerTabButton from "@common/components/TimerTabButton.vue";
import Card from "@common/components/Card.vue";
import {PlusIcon, TrashIcon, CogIcon, EyeIcon, EyeSlashIcon} from "@heroicons/vue/20/solid";
import TopBar from '../components/TopBar.vue'
import BaseContainer from '../components/BaseContainer.vue'
import {useSettingsStore} from '../stores/settings.ts'
import CreateTimerModal from '../components/CreateTimerModal.vue'
import ScreensDrag from '../components/ScreensDrag.vue'
const { api } = window
import SButton from '@common/components/SButton.vue'
import EditTimerModal from '../components/EditTimerModal.vue'
import {ulid} from 'ulid'
import DeleteTimerModal from '../components/DeleteTimerModal.vue'
import ShareTimerButton from '@common/components/ShareTimerButton.vue'
import TimerGeneralCard from '../components/TimerGeneralCard.vue'
import {useWebServerStore} from '../stores/webServer.ts'

const screens = ref<Electron.Display[]>([])
const settingsStore = useSettingsStore()
const webServerStore = useWebServerStore()
const timers = computed<Timers>(() => settingsStore.settings.timers)
const currentTimer = ref<string|null>(null)
const createModalOpen = ref<boolean>(false)
const editingWindowId = ref<string|null>(null)
const editingWindow = computed(() => {
  if (editingWindowId.value === null) {
    return null
  }
  if (!currentTimer.value) {
    return null
  }
  return timers.value[currentTimer.value].windows[editingWindowId.value]
})
const deleteOpen = ref(false)

onBeforeMount(async () => {
  screens.value = await api.getScreens()

  api.onScreensUpdated(async () => {
    screens.value = await api.getScreens()
  })

  const firstTimer = Object.keys(settingsStore.settings.timers)[0]
  currentTimer.value = firstTimer
})

const createTimer = (name: string) => {
  const timerId = ulid()
  timers.value[timerId] = {
    ...structuredClone(DEFAULT_TIMER_SETTINGS),
    ...{
      name,
      windows: {
        [ulid()]: structuredClone(DEFAULT_WINDOW_SETTINGS)
      }
    }
  }
  currentTimer.value = timerId
}

const createWindow = () => {
  timers.value[currentTimer.value].windows[ulid()] = structuredClone(DEFAULT_WINDOW_SETTINGS)
}

const editWindow = (windowId: string) => {
  editingWindowId.value = windowId
}

const removeWindow = (windowId: string) => {
  delete timers.value[currentTimer.value].windows[windowId]
}

const deleteTimer = (timerId: string) => {
  for (const [key, value] of Object.entries(timers.value)) {
    if (value.followTimer === timerId) {
      timers.value[key].followTimer = null
    }
  }
  delete timers.value[timerId]

  if (currentTimer.value === timerId) {
    currentTimer.value = Object.keys(timers.value)[0] ?? null
  }
}
</script>

<style scoped>

</style>
