<script setup lang="ts">
export interface Props {
  value: number
  fillColor?: string
  trackColor?: string
}

defineProps<Props>();
</script>

<template>
  <div class="relative pt-1 px-5">
    <div
      class="overflow-hidden progress-bar mb-4 text-xs flex rounded-sm"
      :style="trackColor ? { backgroundColor: trackColor } : {}"
    >
      <div
        :style="{
          width: `${value}%`,
          ...(fillColor ? { backgroundColor: fillColor } : {}),
        }"
        class="transition shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center"
      />
    </div>
  </div>
</template>

<style scoped>
.progress-bar {
  height: 12vh
}
</style>
