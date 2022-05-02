<template>
  <button
    @click.stop.prevent="click"
    :disabled="disabled"
    class="px-4 py-2 rounded text-white ring-transparent"
    :class="{
      'bg-green-500': type === 'success',
      'bg-green-300': type === 'success' && disabled,
      'hover:bg-green-600': type === 'success' && !disabled,

      'bg-yellow-400': type === 'warning',
      'bg-yellow-200': type === 'warning' && disabled,
      'hover:bg-yellow-500': type === 'warning' && !disabled,

      'bg-red-500': type === 'danger',
      'bg-red-300': type === 'danger' && disabled,
      'hover:bg-red-600': type === 'danger' && !disabled,

      'bg-gray-400': type === 'info',
      'bg-gray-300': type === 'info' && disabled,
      'hover:bg-gray-500': type === 'info' && !disabled,
    }"
  >
    <slot />
  </button>
</template>

<script>
export default {
  name: 'SButton',
  props: {
    type: {
      type: String,
      default: 'success'
    },
    disabled: {
      type: Boolean,
      default: false
    },
  },
  emits: [
    'click',
  ],
  methods: {
    click(event) {
      event.target.blur();
      this.$emit('click')
    }
  }
}
</script>

<style scoped>

</style>
