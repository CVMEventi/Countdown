<template>
  <div v-bind="$attrs" class="rounded-xl shadow-xs border-0 bg-zinc-800 px-3 py-2">
    <slot />
  </div>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'Card',
});
</script>

<style scoped>

</style>
