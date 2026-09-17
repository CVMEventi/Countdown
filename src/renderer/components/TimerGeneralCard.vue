<template>
  <Card class="flex flex-col gap-3">
    <p class="text-lg uppercase">Timer settings</p>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="flex flex-col gap-2">
        <p class="uppercase text-xs text-zinc-400">Behavior</p>
        <div>
          <CheckBox id="stopTimerAtZero" v-model="timer.stopTimerAtZero">Stop timer at 0</CheckBox>
          <p class="text-xs text-zinc-400 pl-5">Stop counting at zero instead of counting extra time</p>
        </div>
        <div>
          <CheckBox id="setTimeLive" v-model="timer.setTimeLive">Set time live</CheckBox>
          <p class="text-xs text-zinc-400 pl-5">While reset, outputs show the set time as you change it</p>
        </div>
      </div>

      <div class="flex flex-col gap-2 md:border-l md:border-zinc-700 md:pl-4">
        <p class="uppercase text-xs text-zinc-400">Timing</p>
        <div class="flex flex-col gap-1">
          <label for="timerDuration" class="text-sm">Ms per second</label>
          <div class="flex items-center gap-2">
            <input
              id="timerDuration"
              v-no-wheel
              class="input rounded-lg text-center px-2 sm:text-sm w-24"
              type="number"
              min="1"
              :value="timer.timerDuration"
              @input="updateTimerDuration">
            <span class="text-sm text-zinc-400">ms</span>
          </div>
          <p class="text-xs text-zinc-400">1000 = real time</p>
        </div>
        <div class="flex flex-col gap-1">
          <label for="followTimer" class="text-sm">Follow timer</label>
          <select id="followTimer" v-model="timer.followTimer" class="input p-2 w-full">
            <option :value="null">None</option>
            <option v-for="id in otherTimers" :key="id" :value="id">
              {{ timers[id].name }}
            </option>
          </select>
          <p class="text-xs text-zinc-400">When reset, outputs show the followed timer</p>
        </div>
      </div>

      <div class="flex flex-col gap-2 md:border-l md:border-zinc-700 md:pl-4 min-w-0">
        <p class="uppercase text-xs text-zinc-400">End sound</p>
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
        <p class="text-xs text-zinc-400">Plays once when the timer reaches 0</p>
      </div>
    </div>
  </Card>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { MusicalNoteIcon, XMarkIcon } from '@heroicons/vue/20/solid'
import { TimerSettings, Timers } from '@common/config.ts'
import Card from '@common/components/Card.vue'
import CheckBox from '@common/components/CheckBox.vue'
import SButton from '@common/components/SButton.vue'

const { api } = window

const props = defineProps<{
  timers: Timers
  timerId: string
}>()

const timer = defineModel<TimerSettings>({ required: true })

const otherTimers = computed(() => Object.keys(props.timers).filter((id) => id !== props.timerId))

const audioFileName = computed(() => timer.value.audioFile?.split(/[\\/]/).pop() ?? '')

const updateTimerDuration = (event: Event) => {
  const value = parseInt((event.target as HTMLInputElement).value)
  if (!Number.isNaN(value) && value > 0) {
    timer.value.timerDuration = value
  }
}

const selectFile = async () => {
  const file = await api.selectAudioFile()
  if (file) {
    timer.value.audioFile = file
  }
}
</script>
