<template>
  <SButton title="Share link" class="inline-flex" tiny type="info" @click="open = true">
    <QrCodeIcon class="w-5" />
  </SButton>
  <ShareTimerModal
    v-model:open="open"
    :timer-id="timerId"
    :window-id="windowId"
    :addresses="addresses"
    :port="port"
    :is-in-browser="isInBrowser"
    :server-running="serverRunning"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { QrCodeIcon } from '@heroicons/vue/20/solid'
import { NetworkAddress } from '../network.ts'
import SButton from './SButton.vue'
import ShareTimerModal from './ShareTimerModal.vue'

defineProps<{
  timerId?: string | null
  windowId?: string
  addresses?: NetworkAddress[]
  port?: number | string | null
  isInBrowser: boolean
  serverRunning?: boolean
}>()

const open = ref(false)
</script>
