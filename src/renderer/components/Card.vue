<template>
  <div class="rounded-xl border-2 p-3">
    <slot />
  </div>
</template>

<script lang="ts">
import {defineComponent} from "vue";

export default defineComponent({
  name: 'Card'
});
</script>

<style scoped>

</style>
