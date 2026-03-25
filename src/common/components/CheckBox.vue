<template>
  <div class="flex items-center">
    <input
      class="rounded-md border-0 bg-zinc-700 focus:ring-0"
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
defineEmits(['update:modelValue']);

export interface Props {
  modelValue: boolean
  id: string
}

defineProps<Props>();
</script>

<style scoped>

</style>
