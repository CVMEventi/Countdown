<template>
  <div class="mt-1 flex rounded-md shadow-sm">
    <div class="handle relative inline-flex items-center space-x-2 px-2 py-1 border border-zinc-700 text-sm font-medium rounded-l-md text-white bg-zinc-700 cursor-move">
      <bars3-icon class="h-5 w-5 text-gray-400" />
    </div>
    <div class="-mr-px -ml-px relative flex items-stretch flex-grow focus-within:z-10">
      <input :value="modelValue"
             @input="input"
             type="number"
             max="1440"
             min="0"
             class="focus:ring-blue-500 focus:border-blue-500 block w-full rounded-none text-center px-2 sm:text-sm border-zinc-700 border-x-zinc-600 bg-zinc-700">
    </div>
    <button @click="$emit('delete', $event)" type="button" class="-ml-px relative inline-flex items-center space-x-2 px-2 py-1 border border-zinc-700 text-sm font-medium rounded-r-md border-l-zinc-600 text-gray-700 bg-zinc-700 hover:bg-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
      <trash-icon class="h-5 w-5 text-gray-400"></trash-icon>
    </button>
  </div>
</template>

<script lang="ts" setup>
import { Bars3Icon, TrashIcon } from '@heroicons/vue/24/outline';

defineOptions({
  'name': 'EditPreset',
});

export interface Props {
  modelValue: number
}

defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [modelValue: number]
  delete: []
}>()

function input(event: InputEvent) {
  let value = parseFloat((event.target as HTMLInputElement).value)
  if (!value) {
    value = 0;
  }
  if (value < 0) {
    value = 0;
  }

  if (value > 1440) {
    value = 1440;
  }

  emit('update:modelValue', value);
}
</script>

<style scoped>
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}
</style>
