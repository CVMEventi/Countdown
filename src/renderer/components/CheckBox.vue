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

<script lang="ts" setup>
defineOptions({
  name: 'CheckBox',
});

defineEmits(['update:modelValue']);

export interface Props {
  modelValue: boolean
  id: string
}

defineProps<Props>();
</script>

<style scoped>

</style>
