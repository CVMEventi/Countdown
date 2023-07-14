<template>
  <div class="mt-1 flex rounded-md shadow-sm">
    <div class="handle relative inline-flex items-center space-x-2 px-2 py-1 border border-gray-300 text-sm font-medium rounded-l-md text-gray-700 bg-gray-50 cursor-move">
      <bars3-icon class="h-5 w-5 text-gray-400" />
    </div>
    <div class="-mr-px -ml-px relative flex items-stretch flex-grow focus-within:z-10">
      <input :value="modelValue"
             @input="input"
             type="number"
             max="1440"
             min="0"
             class="text-black focus:ring-indigo-500 focus:border-indigo-500 block w-full rounded-none text-center px-2 sm:text-sm border-gray-300">
    </div>
    <button @click="$emit('delete', $event)" type="button" class="-ml-px relative inline-flex items-center space-x-2 px-2 py-1 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500">
      <trash-icon class="h-5 w-5 text-gray-400"></trash-icon>
    </button>
  </div>
</template>

<script lang="ts">
import {defineComponent} from "vue";
import { Bars3Icon, TrashIcon } from '@heroicons/vue/24/outline';

export default defineComponent({
  name: "EditPreset",
  components: {
    Bars3Icon,
    TrashIcon,
  },
  emits: [
    'delete',
  ],
  props: {
    modelValue: {
      type: Number,
      required: true,
    }
  },
  methods: {
    input(event) {
      let value = parseFloat(event.target.value)
      if (!value) {
        value = 0;
      }
      if (value < 0) {
        value = 0;
      }

      if (value > 1440) {
        value = 1440
      }

      this.$emit('update:modelValue', value)
    }
  }
});
</script>

<style scoped>
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}
</style>
