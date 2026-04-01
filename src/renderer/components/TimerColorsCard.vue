<template>
  <Card class="border flex flex-col w-full">
    <p class="text-lg uppercase mb-2">Colors</p>

    <div class="grid items-center gap-x-6 gap-y-1"
         style="grid-template-columns: 8rem repeat(6, auto) 1.5rem">

      <!-- Column headers -->
      <div></div>
      <div class="text-xs text-zinc-400 text-center border-b border-zinc-600 pb-1">Background</div>
      <div class="text-xs text-zinc-400 text-center border-b border-zinc-600 pb-1">Text</div>
      <div class="text-xs text-zinc-400 text-center border-b border-zinc-600 pb-1">Progress Bar</div>
      <div class="text-xs text-zinc-400 text-center border-b border-zinc-600 pb-1">Progress Track</div>
      <div class="text-xs text-zinc-400 text-center border-b border-zinc-600 pb-1">Clock Icon</div>
      <div class="text-xs text-zinc-400 text-center border-b border-zinc-600 pb-1">Clock Text</div>
      <div class="pb-1"></div>

      <!-- Idle / Reset -->
      <div class="text-sm text-zinc-300">Idle / Reset</div>
      <ColorInput :alpha-channel="true" v-model="window.colors.resetBackground" default-value="#000000ff"></ColorInput>
      <ColorInput v-model="window.colors.resetText" default-value="#ffffff"></ColorInput>
      <ColorInput v-model="window.colors.resetProgressBar" default-value="#e5e7eb"></ColorInput>
      <div></div>
      <ColorInput v-model="window.colors.resetClock" default-value="#ffffff"></ColorInput>
      <ColorInput v-model="window.colors.resetClockText" default-value="#ffffff"></ColorInput>
      <div></div>

      <!-- Normal -->
      <div class="text-sm text-zinc-300">Normal</div>
      <ColorInput :alpha-channel="true" v-model="window.colors.background" default-value="#000000ff"></ColorInput>
      <ColorInput v-model="window.colors.text" default-value="#ffffff"></ColorInput>
      <ColorInput v-model="window.colors.progressBar" default-value="#22c55e"></ColorInput>
      <ColorInput v-model="window.colors.progressBarTrack" default-value="#bbf7d0"></ColorInput>
      <ColorInput v-model="window.colors.clock" default-value="#ffffff"></ColorInput>
      <ColorInput v-model="window.colors.clockText" default-value="#ffffff"></ColorInput>
      <div></div>

      <!-- Thresholds section header -->
      <div class="col-span-full flex flex-row items-center justify-between border-t border-zinc-700 pt-2 mt-1">
        <div>
          <p class="text-xs uppercase text-zinc-400">Time thresholds</p>
          <p class="text-xs text-zinc-500">Applied when ≤ value, most specific wins.</p>
        </div>
        <button @click="addThreshold" class="text-xs bg-green-600 hover:bg-green-700 rounded px-1.5 py-0.5">+ Add</button>
      </div>

      <!-- Threshold rows -->
      <template v-for="(threshold, index) in thresholds" :key="threshold.id">
        <ThresholdRow
          :model-value="window.colors.thresholds[index]"
          @update:modelValue="window.colors.thresholds[index] = $event"
          @toggle-type="toggleThresholdType(threshold)"
          @remove="removeThreshold(index)"
        />
      </template>

      <div v-if="thresholds.length === 0" class="col-span-full text-xs text-zinc-500 italic">No thresholds defined.</div>

      <!-- Expired -->
      <div class="col-span-full border-t border-zinc-700 mt-1"></div>
      <div class="text-sm text-zinc-300">Expired</div>
      <ColorInput :alpha-channel="true" v-model="window.colors.expiredBackground" default-value="#000000ff"></ColorInput>
      <ColorInput v-model="window.colors.expiredText" default-value="#ff0000"></ColorInput>
      <ColorInput v-model="window.colors.expiredProgressBar" default-value="#b91c1c"></ColorInput>
      <div></div>
      <ColorInput v-model="window.colors.expiredClock" default-value="#ffffff"></ColorInput>
      <ColorInput v-model="window.colors.expiredClockText" default-value="#ffffff"></ColorInput>
      <div></div>
    </div>
  </Card>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { WindowSettings, ColorThreshold, DEFAULT_COLOR_THRESHOLD } from '../../common/config.ts'
import { ulid } from 'ulid'
import Card from '@common/components/Card.vue'
import ColorInput from './ColorInput.vue'
import ThresholdRow from './ThresholdRow.vue'

const window = defineModel<WindowSettings>({ required: true })

const thresholds = computed(() => {
  if (!window.value.colors.thresholds) {
    window.value.colors.thresholds = []
  }
  return window.value.colors.thresholds
})

const addThreshold = () => {
  if (!window.value.colors.thresholds) {
    window.value.colors.thresholds = []
  }
  window.value.colors.thresholds.push({
    ...DEFAULT_COLOR_THRESHOLD,
    id: ulid(),
  })
}

const removeThreshold = (index: number) => {
  window.value.colors.thresholds?.splice(index, 1)
}

const toggleThresholdType = (threshold: ColorThreshold) => {
  threshold.type = threshold.type === 'minutes' ? 'percent' : 'minutes'
}
</script>
