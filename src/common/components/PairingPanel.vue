<template>
  <div class="flex flex-col gap-2">
    <div v-if="!code" class="text-sm italic text-zinc-400">Enable the web remote to get a code.</div>

    <template v-else>
      <div class="flex gap-1">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="flex-1 text-xs uppercase py-1 rounded cursor-pointer"
          :class="active === tab.id ? 'bg-zinc-600 text-white' : 'bg-zinc-700 text-zinc-400'"
          @click="active = tab.id">
          {{ tab.label }}
        </button>
      </div>

      <p class="font-mono text-center tracking-widest text-sm select-all">{{ code }}</p>

      <div v-if="url" class="flex justify-center">
        <QrCode :text="url" class="max-w-[140px]" />
      </div>

      <div class="flex gap-2">
        <input :value="url || code" readonly class="input flex-1 min-w-0 text-xs" @focus="selectAll" />
        <SButton tiny type="info" title="Copy" @click="copy">
          <ClipboardDocumentIcon class="w-5 h-5" />
        </SButton>
      </div>
      <p v-if="copyState" class="text-xs italic text-zinc-400">{{ copyState }}</p>

      <p v-if="!spaUrl" class="text-xs italic text-zinc-400">
        Set the remote page address to get a scannable link.
      </p>
      <p v-else-if="active === 'view'" class="text-xs text-zinc-400">
        View only — can watch the timers but not change them.
      </p>
      <p v-else class="text-xs text-amber-300">
        Full control. Share only with your operator.
      </p>

      <SButton tiny type="warning" class="uppercase" @click="$emit('rotate')">New code</SButton>

      <div v-if="clients.length" class="mt-2 pt-2 border-t border-zinc-700 flex flex-col gap-1">
        <p class="uppercase text-xs text-zinc-400">Connected</p>
        <div v-for="client in clients" :key="client.clientId" class="flex items-center gap-2 text-xs">
          <span class="flex-1 truncate">{{ client.name }}</span>
          <span class="text-zinc-400">{{ client.role === 'control' ? 'control' : 'view' }}</span>
          <span v-if="client.rttMs !== null" class="text-zinc-500">{{ client.rttMs }}ms</span>
          <SButton tiny type="danger" @click="$emit('revoke', client.clientId)">Kick</SButton>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {ClipboardDocumentIcon} from '@heroicons/vue/24/outline'
import QrCode from './QrCode.vue'
import SButton from './SButton.vue'
import {copyText} from '../clipboard.ts'
import type {WebRtcClient} from '../webrtcStatus.ts'

const props = defineProps<{
  controlCode: string | null
  viewCode: string | null
  spaUrl: string
  clients: WebRtcClient[]
}>()

defineEmits<{rotate: [], revoke: [clientId: string]}>()

const tabs = [
  {id: 'control', label: 'Control'},
  {id: 'view', label: 'View only'},
]

const active = ref('control')
const copyState = ref('')

const code = computed(() => (active.value === 'control' ? props.controlCode : props.viewCode))

// The code sits in the fragment so it is never sent to the web server hosting the page
const url = computed(() => {
  if (!props.spaUrl || !code.value) return ''
  return `${props.spaUrl.replace(/#.*$/, '').replace(/\/$/, '')}#/r/${code.value.replace(/-/g, '')}`
})

function selectAll(event: Event) {
  (event.target as HTMLInputElement).select()
}

async function copy() {
  copyState.value = (await copyText(url.value || code.value || '')) ? 'Copied' : 'Press Ctrl/Cmd+C'
  setTimeout(() => { copyState.value = '' }, 2000)
}
</script>
