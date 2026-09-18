<template>
  <div class="flex flex-col gap-2">
    <SButton tiny type="warning" class="uppercase" @click="$emit('rotate')">New code</SButton>
    <p class="text-xs italic text-zinc-400">
      Replaces every link, including ones already shared.
    </p>

    <div v-if="clients.length" class="mt-2 pt-2 border-t border-zinc-700 flex flex-col gap-1">
      <p class="uppercase text-xs text-zinc-400">Connected</p>
      <div v-for="client in clients" :key="client.clientId" class="flex items-center gap-2 text-xs">
        <span class="flex-1 truncate">{{ client.name }}</span>
        <span class="text-zinc-400">{{ client.role === 'control' ? 'control' : 'view' }}</span>
        <span v-if="client.rttMs !== null" class="text-zinc-500">{{ client.rttMs }}ms</span>
        <SButton tiny type="danger" @click="$emit('revoke', client.clientId)">Kick</SButton>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import SButton from './SButton.vue'
import type {WebRtcClient} from '../webrtcStatus.ts'

defineProps<{
  clients: WebRtcClient[]
}>()

defineEmits<{rotate: [], revoke: [clientId: string]}>()
</script>
