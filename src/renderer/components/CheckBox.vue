<template>
  <div>
    <input
      :id="id"
      :checked="modelValue"
      @input="$emit('update:modelValue', $event.target.checked)"
      type="checkbox" />
    <label
      class="pl-1 text-sm"
      :for="id">
      <slot></slot>
    </label>
  </div>
</template>

<script>
import {defineComponent} from "vue";

export default defineComponent({
  name: "CheckBox",
  props: {
    modelValue: Boolean,
    id: String,
  }
});
</script>

<style scoped>

</style>
