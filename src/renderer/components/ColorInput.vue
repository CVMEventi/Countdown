<template>
  <div class="flex">
    <input class="min-h-color" @input="$emit('input', $event.target.value)" :value="value" type="color" placeholder="#000000">
    <button @click="$emit('input', defaultValue)" v-if="value !== defaultValue">
      <i class="mdi-set mdi-reload"></i>
    </button>
  </div>
</template>

<script>
export default {
  name: "ColorInput",
  props: {
    value: String,
    defaultValue: String
  }
}
</script>

<style scoped>
  .min-h-color {
    min-height: 27px;
  }
</style>
