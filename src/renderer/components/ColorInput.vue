<template>
  <div class="flex">
    <input
      class="min-h-color"
      :value="value"
      type="color"
      placeholder="#000000"
      @input="$emit('input', $event.target.value)"
    >
    <button v-if="value !== defaultValue" @click="$emit('input', defaultValue)">
      <i class="mdi-set mdi-reload" />
    </button>
  </div>
</template>

<script>
export default {
  name: 'ColorInput',
  props: {
    value: {
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
