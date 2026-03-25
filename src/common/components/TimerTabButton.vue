<script setup lang="ts">
  defineProps<{
    active: boolean
  }>()
</script>

<template>
  <button :class="{
    button: true,
    active: active
  }">
    <slot></slot>
  </button>
</template>

<style scoped>
  .button {
    @apply font-bold relative min-w-0 overflow-hidden text-gray-400 hover:text-gray-700;
    @apply bg-white py-1 px-4 text-sm text-center hover:bg-gray-50 focus:z-10 first:rounded-l-lg last:rounded-r-lg border-r border-black border-solid last:border-none;
  }

  .active {
    @apply text-gray-900 bg-gray-100;
  }
</style>
