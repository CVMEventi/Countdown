<template>
  <div class="inline-flex flex-col shadow-sm rounded-lg">
    <button @click="$emit('up-click', $event)" type="button" class="text-center justify-center relative inline-flex items-center py-2 rounded-t-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none">
      <slot name="up"></slot>
    </button>
    <span class="-mt-px relative inline-flex justify-center items-center py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
      <slot></slot>
    </span>
    <button @click="$emit('down-click', $event)" type="button" class="text-center justify-center -mt-px relative inline-flex items-center px-4 py-2 rounded-b-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none">
      <slot name="down"></slot>
    </button>
  </div>
</template>

<script setup lang="ts">
defineEmits([
  'up-click',
  'down-click',
]);
</script>

<style scoped>

</style>
