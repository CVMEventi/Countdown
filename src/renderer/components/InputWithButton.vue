<template>
  <form @submit.prevent="$emit('click', $event)" class="flex rounded-md shadow-sm">
    <div class="-mr-px relative flex items-stretch flex-grow focus-within:z-10">
      <input :value="modelValue"
             @input="$emit('input', ($event.target as HTMLInputElement).value)"
             :type="type"
             max="100"
             min="0"
             class="text-black focus:ring-indigo-500 focus:border-indigo-500 block rounded-l-md w-full rounded-none text-center px-2 sm:text-sm border-gray-300">
    </div>
    <button @click="$emit('click', $event)" type="button" class="-ml-px relative inline-flex items-center space-x-2 px-2 py-0.5 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500">
      <slot></slot>
    </button>
  </form>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'InputWithButton',
});

export interface Props {
  modelValue: number|string
  type: string
}

defineProps<Props>();

defineEmits<{
  input: [value: string]
  click: [],
}>();
</script>

<style scoped>

</style>
