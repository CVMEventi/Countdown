<template>
  <div class="min-h-screen bg-zinc-900 text-white p-4">
    <div class="flex flex-col gap-4">
      <ControlPanel
        showNav
        :timers="timers"
        :updates="updates"
        v-model:currentTimerId="currentTimerId"
        :controller="controller"
      />
      <div v-if="!connected" class="text-red-400 text-sm">WebSocket disconnected — reconnecting…</div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import ControlPanel from '@common/components/ControlPanel.vue'
import { HttpTimerController } from '../HttpTimerController.ts'
import { useWebSocketTimerState } from '../useWebSocketTimerState.ts'

const controller = new HttpTimerController()
const { timers, updates, currentTimerId, connected } = useWebSocketTimerState()
</script>
