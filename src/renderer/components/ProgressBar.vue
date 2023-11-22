<script setup lang="ts">
export interface Props {
  value: number
  isCountingUp: boolean
  isReset: boolean
  isExpiring: boolean
}

defineProps<Props>();
</script>

<template>
  <div class="relative pt-1 px-5">
    <div
      class="overflow-hidden progress-bar mb-4 text-xs flex rounded"
      :class="{
          'bg-red-200': isCountingUp && !isReset,
          'bg-green-200': !isCountingUp && !isExpiring,
          'bg-yellow-200': isExpiring,
          'bg-gray-200': isReset
        }"
    >
      <div
        :style="{width: `${value}%`}"
        class="transition shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center"
        :class="{
            'bg-red-700': isCountingUp && !isReset,
            'bg-green-500': !isCountingUp && !isReset && !isExpiring,
            'bg-yellow-500': isExpiring,
          }"
      />
    </div>
  </div>
</template>

<style scoped>
.progress-bar {
  height: 12vh
}
</style>
