<template>
  <SButton title="Open timer in browser" class="inline-flex" tiny type="info" @click="openTimerInBrowser">
    <ArrowUpRightIcon class="w-5" />
    <GlobeAltIcon class="w-5" />
  </SButton>
</template>

<script setup lang="ts">
import { ArrowUpRightIcon, GlobeAltIcon } from '@heroicons/vue/20/solid'
import SButton from '@common/components/SButton.vue'

const props = defineProps<{
  serverPort?: number
  timerId: string
  isInBrowser: boolean
}>()

const openTimerInBrowser = () => {
  if (props.isInBrowser) {
    window.open(`/remote#/countdown/${props.timerId}`, '_blank');
  } else {
    window.open(`http://127.0.0.1:${props.serverPort}/remote/index.html#/countdown/${props.timerId}`, '_blank');
  }
}
</script>

<style scoped>

</style>
