<template>
  <Card class="flex flex-col gap-4">
    <p class="text-lg uppercase">Timer settings</p>

    <div class="flex flex-col gap-2">
      <p class="uppercase text-xs text-zinc-400">Behavior</p>
      <div class="flex items-center gap-1">
        <CheckBox id="stopTimerAtZero" v-model="timer.stopTimerAtZero">Stop timer at 0</CheckBox>
        <InfoTip text="Stop counting at zero instead of counting extra time" />
      </div>
      <div class="flex items-center gap-1">
        <CheckBox id="setTimeLive" v-model="timer.setTimeLive">Set time live</CheckBox>
        <InfoTip text="While reset, outputs show the set time as you change it" />
      </div>
    </div>

    <div class="flex flex-col gap-2 border-t border-zinc-700 pt-3">
      <p class="uppercase text-xs text-zinc-400">Timing</p>
      <div class="flex items-center gap-2">
        <label for="timerDuration" class="text-sm">Ms per second</label>
        <InfoTip text="1000 = real time" />
        <input
          id="timerDuration"
          v-no-wheel
          class="input rounded-lg text-center px-2 sm:text-sm w-20 ml-auto"
          type="number"
          min="1"
          :value="timer.timerDuration"
          @input="updateTimerDuration">
      </div>
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-1">
          <label for="playbackSource" class="text-sm">Timer source</label>
          <InfoTip text="While this source plays a clip, outputs show the clip's remaining time. This timer keeps counting underneath and comes back when the clip ends." />
        </div>
        <select id="playbackSource" v-model="timer.playbackSource" class="input p-2 w-full">
          <option :value="null">None</option>
          <option v-for="(source, sourceId) in playbackSources" :key="sourceId" :value="sourceId">
            {{ source.name || providerName(source.provider) }}
          </option>
        </select>
        <p v-if="Object.keys(playbackSources).length === 0" class="text-xs italic text-zinc-400">
          Add one under Remote settings → Timer sources first.
        </p>
      </div>
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-1">
          <label for="followTimer" class="text-sm">Follow timer</label>
          <InfoTip text="When reset, outputs show the followed timer" />
        </div>
        <select id="followTimer" v-model="timer.followTimer" class="input p-2 w-full">
          <option :value="null">None</option>
          <option v-for="id in otherTimers" :key="id" :value="id">
            {{ timers[id].name }}
          </option>
        </select>
      </div>
    </div>

    <div class="flex flex-col gap-2 border-t border-zinc-700 pt-3 min-w-0">
      <div class="flex items-center gap-1">
        <p class="uppercase text-xs text-zinc-400">End sound</p>
        <InfoTip text="Plays once when the timer reaches 0" />
      </div>
      <div v-if="timer.audioFile" class="flex items-center gap-2 rounded-lg bg-zinc-700 px-2 py-1 min-w-0">
        <MusicalNoteIcon class="w-5 shrink-0 text-zinc-300" />
        <span class="flex-1 truncate text-sm" :title="timer.audioFile">{{ audioFileName }}</span>
        <SButton title="Remove sound" tiny type="danger" @click="timer.audioFile = null"><XMarkIcon class="w-4" /></SButton>
      </div>
      <div v-else class="flex items-center gap-2 rounded-lg bg-zinc-700/50 px-2 py-1.5 text-sm italic text-zinc-400">
        <MusicalNoteIcon class="w-5 shrink-0" />
        No sound
      </div>
      <SButton class="self-start" tiny type="info" @click="selectFile">
        {{ timer.audioFile ? 'Replace…' : 'Choose file…' }}
      </SButton>
      <div class="flex flex-col gap-1">
        <label for="audioOutputDevice" class="text-sm">Output</label>
        <select id="audioOutputDevice" v-model="audioOutputDeviceId" class="input p-2 w-full">
          <option :value="null">System default</option>
          <option v-for="device in audioOutputDevices" :key="device.deviceId" :value="device.deviceId">
            {{ device.label }}
          </option>
          <option v-if="isSelectedDeviceMissing" :value="audioOutputDeviceId">Unavailable device</option>
        </select>
      </div>
    </div>

    <div class="flex flex-col gap-1 border-t border-zinc-700 pt-3 min-w-0">
      <p class="uppercase text-xs text-zinc-400">Timer ID</p>
      <div class="flex items-center gap-2 min-w-0">
        <code class="flex-1 truncate text-xs text-zinc-300" :title="timerId">{{ timerId }}</code>
        <SButton title="Copy timer ID" class="inline-flex shrink-0" tiny type="info" @click="copyId">
          <CheckIcon v-if="copied" class="w-4" />
          <ClipboardDocumentIcon v-else class="w-4" />
        </SButton>
      </div>
    </div>
  </Card>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { CheckIcon, ClipboardDocumentIcon, MusicalNoteIcon, XMarkIcon } from '@heroicons/vue/20/solid'
import { TimerSettings, Timers } from '@common/config.ts'
import { playbackProviderMeta } from '@common/playback.ts'
import { useSettingsStore } from '../stores/settings.ts'
import { copyText } from '@common/clipboard.ts'
import Card from '@common/components/Card.vue'
import CheckBox from '@common/components/CheckBox.vue'
import SButton from '@common/components/SButton.vue'
import InfoTip from './InfoTip.vue'

const { api } = window

const props = defineProps<{
  timers: Timers
  timerId: string
}>()

const timer = defineModel<TimerSettings>({ required: true })

const settingsStore = useSettingsStore()
const playbackSources = computed(() => settingsStore.settings.remote?.playback ?? {})

function providerName(providerId: string) {
  return playbackProviderMeta(providerId)?.displayName ?? providerId
}

const otherTimers = computed(() => Object.keys(props.timers).filter((id) => id !== props.timerId))

const audioFileName = computed(() => timer.value.audioFile?.split(/[\\/]/).pop() ?? '')

const copied = ref(false)
let copiedTimeout: ReturnType<typeof setTimeout> | undefined

watch(() => props.timerId, () => {
  copied.value = false
})

const copyId = async () => {
  if (await copyText(props.timerId)) {
    copied.value = true
    clearTimeout(copiedTimeout)
    copiedTimeout = setTimeout(() => copied.value = false, 1500)
  }
}

const updateTimerDuration = (event: Event) => {
  const value = parseInt((event.target as HTMLInputElement).value)
  if (!Number.isNaN(value) && value > 0) {
    timer.value.timerDuration = value
  }
}

interface AudioOutputDevice {
  deviceId: string
  label: string
}

const audioOutputDevices = ref<AudioOutputDevice[]>([])

// Older timers were saved before the output could be chosen
const audioOutputDeviceId = computed({
  get: () => timer.value.audioOutputDeviceId ?? null,
  set: (deviceId: string | null) => timer.value.audioOutputDeviceId = deviceId,
})

const isSelectedDeviceMissing = computed(() => audioOutputDeviceId.value !== null
  && !audioOutputDevices.value.some((device) => device.deviceId === audioOutputDeviceId.value))

const loadAudioOutputDevices = async () => {
  const devices = await navigator.mediaDevices.enumerateDevices()
  audioOutputDevices.value = devices
    // "default" follows the system choice, which is what the "System default" option already does
    .filter((device) => device.kind === 'audiooutput' && device.deviceId !== 'default')
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `Output ${index + 1}`,
    }))
}

onMounted(() => {
  loadAudioOutputDevices()
  navigator.mediaDevices.addEventListener('devicechange', loadAudioOutputDevices)
})

onUnmounted(() => {
  navigator.mediaDevices.removeEventListener('devicechange', loadAudioOutputDevices)
})

const selectFile = async () => {
  const file = await api.selectAudioFile()
  if (file) {
    timer.value.audioFile = file
  }
}
</script>
