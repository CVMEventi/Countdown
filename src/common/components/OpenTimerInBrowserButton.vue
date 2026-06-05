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
  serverPort?: number|string
  timerId?: string
  windowId?: string
  isInBrowser: boolean
}>()

const openTimerInBrowser = () => {
  const windowPath = props.windowId ? `/${props.windowId}`: ''
  if (props.isInBrowser) {
    window.open(`/remote#/countdown/${props.timerId}${windowPath}`, '_blank');
  } else {
    window.open(`http://127.0.0.1:${props.serverPort}/remote#/countdown/${props.timerId}${windowPath}`, '_blank');
  }
}
</script>

<style scoped>

</style>
