<template>
  <div class="flex">
    <input
      class="min-h-color"
      :value="modelValue"
      type="color"
      placeholder="#000000"
      @input="$emit('update:modelValue', $event.target.value)"
    >
    <button class="ml-2" v-if="modelValue !== defaultValue" @click="$emit('update:modelValue', defaultValue)">
      <refresh-icon class="w-5 h-5 inline-flex"></refresh-icon>
    </button>
  </div>
</template>

<script>
import { RefreshIcon } from '@heroicons/vue/outline';

export default {
  name: 'ColorInput',
  components: {
    RefreshIcon,
  },
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    defaultValue: {
      type: String,
      default: ''
    }
  }
}
</script>

<style scoped>
  .min-h-color {
    min-height: 27px;
  }
</style>
