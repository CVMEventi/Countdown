<template>
  <div class="flex flex-row items-center gap-1">
    <span class="text-xs text-zinc-400">≤</span>
    <input
      type="number"
      min="0"
      v-model.number="threshold.value"
      class="input w-12 text-center text-sm px-1 rounded"
    />
    <button
      @click="$emit('toggleType')"
      class="text-sm bg-zinc-700 hover:bg-zinc-600 rounded px-1.5 py-0.5 shrink-0 w-9"
    >{{ threshold.type === 'minutes' ? 'min' : '%' }}</button>
  </div>
  <ColorInput :alpha-channel="true" v-model="threshold.background" default-value="#000000ff"></ColorInput>
  <ColorInput v-model="threshold.text" default-value="#ffff00"></ColorInput>
  <ColorInput v-model="threshold.progressBar" default-value="#eab308"></ColorInput>
  <ColorInput v-model="threshold.progressBarTrack" default-value="#fef9c3"></ColorInput>
  <ColorInput v-model="threshold.clock" default-value="#ffffff"></ColorInput>
  <ColorInput v-model="threshold.clockText" default-value="#ffffff"></ColorInput>
  <button @click="$emit('remove')" class="text-red-400 hover:text-red-300 flex items-center justify-center">
    <TrashIcon class="w-4 h-4" />
  </button>
</template>

<script lang="ts" setup>
import { ColorThreshold } from '../../common/config.ts'
import { TrashIcon } from '@heroicons/vue/24/outline'
import ColorInput from './ColorInput.vue'

const threshold = defineModel<ColorThreshold>({ required: true })
defineEmits<{ toggleType: []; remove: [] }>()
</script>
