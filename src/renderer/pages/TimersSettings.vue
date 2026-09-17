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
      <div class="flex flex-1 flex-col gap-2 min-w-0 min-h-0">
        <div class="flex flex-row items-center justify-between">
          <p class="text-lg uppercase">Windows</p>
          <div class="flex flex-row items-center gap-2">
            <button
              type="button"
              :title="lockRatio ? 'Aspect ratio locked while resizing (hold Shift to free it)' : 'Lock aspect ratio while resizing (hold Shift to lock temporarily)'"
              class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs uppercase cursor-pointer"
              :class="lockRatio
                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'"
              @click="lockRatio = !lockRatio"
            >
              <LockClosedIcon v-if="lockRatio" class="w-4" />
              <LockOpenIcon v-else class="w-4" />
              Ratio
            </button>
            <button title="Add window" @click="createWindow" class="relative min-w-0 overflow-hidden font-normal text-white bg-green-500 py-0.5 px-1 text-sm text-center hover:bg-green-600 focus:z-10 rounded-lg"><PlusIcon class="h-6" /></button>
          </div>
        </div>
        <div class="h-[40vh] shrink-0">
          <ScreensDrag :screens="screens" v-model:windows="timers[currentTimer].windows" :highlighted-window="hoveredWindow" :lock-ratio="lockRatio" @hover="hoveredWindow = $event" />
        </div>
        <div class="flex flex-1 flex-col gap-2 min-h-0 overflow-y-auto">
          <WindowRow
            v-for="(window, key, index) in timers[currentTimer].windows"
            :key="key"
            v-model:window="timers[currentTimer].windows[key]"
            :index="index"
            :window-id="key as string"
            :timer-id="currentTimer"
            :screens="screens"
            :can-delete="Object.keys(timers[currentTimer].windows).length > 1"
            :highlighted="hoveredWindow === key"
            @hover="hoveredWindow = $event ? key as string : null"
            @edit="editWindow(key as string)"
            @remove="removeWindow(key as string)"
          />
        </div>
      </div>
    </div>
    <EditTimerModal :screens="screens" v-model:window="editingWindow" v-model:window-id="editingWindowId" />
    <DeleteTimerModal v-model:open="deleteOpen" @delete="deleteTimer" :timer-name="timers[currentTimer!]?.name ?? null" :timer-id="currentTimer" />
  </BaseContainer>
</template>

<script setup lang="ts">
import {computed, onBeforeMount, ref} from 'vue'
import { DEFAULT_TIMER_SETTINGS, DEFAULT_WINDOW_SETTINGS, Timers } from '@common/config.ts'
import TimersNavigation from "@common/components/TimersNavigation.vue";
import TimerTabButton from "@common/components/TimerTabButton.vue";
import {LockClosedIcon, LockOpenIcon, PlusIcon, TrashIcon} from "@heroicons/vue/20/solid";
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
import TimerGeneralCard from '../components/TimerGeneralCard.vue'
import WindowRow from '../components/WindowRow.vue'

const screens = ref<Electron.Display[]>([])
const settingsStore = useSettingsStore()
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
const hoveredWindow = ref<string|null>(null)
const lockRatio = ref(false)

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
