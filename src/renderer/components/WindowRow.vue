<template>
  <Card
    class="ring-2 ring-inset transition-shadow"
    :class="highlighted ? 'ring-blue-500' : 'ring-transparent'"
    @pointerenter="emit('hover', true)"
    @pointerleave="emit('hover', false)"
  >
    <div class="flex items-center gap-2 min-w-0">
      <span class="w-8 shrink-0 text-center text-xl rounded-lg bg-blue-500">{{ index + 1 }}</span>
      <span class="flex-1 truncate text-sm" :class="windowSettings.bounds.hidden ? 'text-zinc-500' : 'text-zinc-300'" :title="summary">{{ summary }}</span>
      <button
        type="button"
        :title="windowSettings.bounds.hidden ? 'Show window' : 'Hide window'"
        class="shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs uppercase cursor-pointer"
        :class="windowSettings.bounds.hidden
          ? 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'"
        @click="windowSettings.bounds.hidden = !windowSettings.bounds.hidden"
      >
        <EyeSlashIcon v-if="windowSettings.bounds.hidden" class="w-4" />
        <EyeIcon v-else class="w-4" />
        {{ windowSettings.bounds.hidden ? 'Hidden' : 'Visible' }}
      </button>
      <div class="flex shrink-0 flex-row gap-2">
        <ShareTimerButton
          :is-in-browser="false"
          :addresses="webServerStore.addresses"
          :port="webServerStore.port"
          :server-running="webServerStore.isRunning"
          :timer-id="timerId"
          :window-id="windowId"
        />
        <SButton title="Settings" tiny type="info" @click="emit('edit')"><CogIcon class="w-5" /></SButton>
        <SButton title="Delete" tiny type="danger" :disabled="!canDelete" @click="emit('remove')"><TrashIcon class="w-5" /></SButton>
      </div>
    </div>
  </Card>
</template>

<script lang="ts" setup>
import {computed} from 'vue'
import {CogIcon, EyeIcon, EyeSlashIcon, TrashIcon} from '@heroicons/vue/20/solid'
import Card from '@common/components/Card.vue'
import SButton from '@common/components/SButton.vue'
import ShareTimerButton from '@common/components/ShareTimerButton.vue'
import {WindowSettings} from '@common/config.ts'
import {useWebServerStore} from '../stores/webServer.ts'

defineOptions({
  name: 'WindowRow',
})

const props = defineProps<{
  index: number
  windowId: string
  timerId: string
  screens: Electron.Display[]
  canDelete: boolean
  highlighted: boolean
}>()

const emit = defineEmits<{
  edit: []
  remove: []
  hover: [hovering: boolean]
}>()

const windowSettings = defineModel<WindowSettings>('window', {required: true})
const webServerStore = useWebServerStore()

const isFullscreen = computed(() => windowSettings.value.bounds.fullscreenOn !== null)

const fullscreenScreen = computed(() => props.screens.find((screen) => screen.id === windowSettings.value.bounds.fullscreenOn))

const summary = computed(() => {
  const bounds = windowSettings.value.bounds
  if (isFullscreen.value) {
    if (!fullscreenScreen.value) {
      return 'Fullscreen · Screen missing'
    }
    const screenIndex = props.screens.indexOf(fullscreenScreen.value)
    return `Fullscreen · Screen ${screenIndex + 1}`
  }
  return `Windowed · ${bounds.width}×${bounds.height} · X ${bounds.x} Y ${bounds.y}`
})
</script>
