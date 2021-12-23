<template>
  <button
    class="px-4 py-2 rounded text-white ring-transparent"
    :class="{
      'bg-gray-300': !selected,
      'bg-gray-500': selected,
    }"
  >
    <slot />
  </button>
</template>

<script>
export default {
  name: 'TabButton',
  props: {
    selected: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style scoped>

</style>
