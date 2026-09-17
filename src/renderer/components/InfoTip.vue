<template>
  <span
    ref="anchor"
    class="inline-flex text-zinc-500 hover:text-zinc-300 cursor-help"
    tabindex="0"
    :aria-label="text"
    @mouseenter="show"
    @mouseleave="visible = false"
    @focus="show"
    @blur="visible = false">
    <InformationCircleIcon class="w-4" />
  </span>
  <!-- Fixed so the tip is not clipped by scrolling parents -->
  <Teleport to="body">
    <div
      v-if="visible"
      role="tooltip"
      class="fixed z-50 max-w-56 rounded-lg bg-zinc-950 px-2 py-1 text-xs text-zinc-200 shadow-lg pointer-events-none"
      :style="{ left: `${position.left}px`, top: `${position.top}px` }">
      {{ text }}
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { InformationCircleIcon } from '@heroicons/vue/20/solid'

defineProps<{
  text: string
}>()

const anchor = ref<HTMLElement | null>(null)
const visible = ref(false)
const position = ref({ left: 0, top: 0 })

const show = () => {
  if (!anchor.value) return
  const rect = anchor.value.getBoundingClientRect()
  position.value = { left: rect.left, top: rect.bottom + 4 }
  visible.value = true
}
</script>
