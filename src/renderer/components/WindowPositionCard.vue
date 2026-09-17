<template>
  <Card class="flex flex-col gap-2 w-64 shrink-0">
    <p class="text-lg uppercase">Position</p>
    <div class="flex items-center gap-2">
      <p class="uppercase text-xs text-zinc-400 w-12">Mode</p>
      <div class="inline-flex rounded-lg bg-zinc-700 p-0.5 text-sm">
        <button
          type="button"
          class="rounded-md px-3 py-0.5 cursor-pointer"
          :class="!isFullscreen ? 'bg-blue-500 text-white' : 'text-zinc-300 hover:text-white'"
          @click="setWindowed"
        >Windowed</button>
        <button
          type="button"
          class="rounded-md px-3 py-0.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          :class="isFullscreen ? 'bg-blue-500 text-white' : 'text-zinc-300 hover:text-white'"
          :disabled="screens.length === 0"
          @click="setFullscreen"
        >Fullscreen</button>
      </div>
    </div>

    <div v-if="isFullscreen" class="flex items-center gap-2">
      <label for="fullscreenOn" class="uppercase text-xs text-zinc-400 w-12">Screen</label>
      <select id="fullscreenOn" v-model="windowSettings.bounds.fullscreenOn" class="input p-2 flex-1 min-w-0">
        <option v-if="windowSettings.bounds.fullscreenOn === null" :value="null" disabled>Select a screen…</option>
        <option v-else-if="!fullscreenScreen" :value="windowSettings.bounds.fullscreenOn" disabled>Screen missing</option>
        <option v-for="(screen, screenIndex) in screens" :key="screen.id" :value="screen.id">
          Screen {{ screenIndex + 1 }}
          ({{ screen.size.width }}x{{ screen.size.height }}{{ screen.internal ? " Internal" : "" }})
        </option>
      </select>
    </div>

    <div v-else class="grid grid-cols-2 gap-2">
      <div v-for="field in boundFields" :key="field.key" class="flex flex-col gap-0.5 min-w-0">
        <label :for="`bounds-${field.key}`" class="uppercase text-xs text-zinc-400">{{ field.label }}</label>
        <input
          :id="`bounds-${field.key}`"
          :value="windowSettings.bounds[field.key]"
          @input="setBound(field.key, $event)"
          v-no-wheel
          type="number"
          class="input w-20 rounded-lg px-2 sm:text-sm"
        >
      </div>
    </div>
  </Card>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import Card from '@common/components/Card.vue'
import {WindowSettings} from '@common/config.ts'

defineOptions({
  name: 'WindowPositionCard',
})

type BoundKey = 'x' | 'y' | 'width' | 'height'

const props = defineProps<{
  screens: Electron.Display[]
}>()

const windowSettings = defineModel<WindowSettings>({required: true})

const boundFields: { key: BoundKey, label: string }[] = [
  {key: 'x', label: 'X'},
  {key: 'y', label: 'Y'},
  {key: 'width', label: 'Width'},
  {key: 'height', label: 'Height'},
]

// Fullscreen is chosen but no screen picked yet: the window stays windowed until one is selected
const pendingFullscreen = ref(false)

const isFullscreen = computed(() => pendingFullscreen.value || windowSettings.value.bounds.fullscreenOn !== null)

const fullscreenScreen = computed(() => props.screens.find((screen) => screen.id === windowSettings.value.bounds.fullscreenOn))

const setWindowed = () => {
  pendingFullscreen.value = false
  windowSettings.value.bounds.fullscreenOn = null
}

const setFullscreen = () => {
  pendingFullscreen.value = true
}

const setBound = (key: BoundKey, event: Event) => {
  const value = (event.target as HTMLInputElement).value
  windowSettings.value.bounds[key] = value !== '' ? parseInt(value) : 0
}
</script>
