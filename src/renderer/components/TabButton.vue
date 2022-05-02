<template>
  <a
    href="javascript:;"
    :class="[
      selected ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700',
      first ? 'rounded-l-lg' : '',
      last ? 'rounded-r-lg' : '',
    ]"
    class="tab-button group"
    :aria-current="selected ? 'page' : undefined"
  >
    <span>
      <slot />
    </span>
    <span
      aria-hidden="true"
      :class="[selected ? 'bg-indigo-500' : 'bg-transparent', 'absolute inset-x-0 bottom-0 h-0.5']"
    />
  </a>
</template>

<script>
export default {
  name: 'TabButton',
  props: {
    first: {
      type: Boolean,
      default: false
    },
    last: {
      type: Boolean,
      default: false
    },
    selected: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style scoped>
  .tab-button {
    @apply relative min-w-0 overflow-hidden;
    @apply bg-white py-4 px-4 text-sm font-medium text-center hover:bg-gray-50 focus:z-10;
  }
</style>
