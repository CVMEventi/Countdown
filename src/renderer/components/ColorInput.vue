<template>
  <div class="flex">
    <input
      class="min-h-color"
      :value="modelValue"
      type="color"
      placeholder="#000000"
      @input="$emit('update:modelValue', $event.target.value)"
    >
    <button v-if="modelValue !== defaultValue" @click="$emit('update:modelValue', defaultValue)">
      <i class="mdi-set mdi-reload" />
    </button>
  </div>
</template>

<script>
export default {
  name: 'ColorInput',
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
