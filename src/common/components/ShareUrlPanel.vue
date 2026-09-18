<template>
  <div class="flex flex-col gap-2">
    <select
      v-if="entries.length > 1"
      v-model="selectedAddress"
      class="input w-full"
    >
      <option v-for="entry in entries" :key="entry.address" :value="entry.address">
        {{ entry.interface }} · {{ entry.address }}
      </option>
    </select>

    <div class="flex justify-center">
      <QrCode :text="url" :class="compact ? 'max-w-[140px]' : 'max-w-[260px]'" />
    </div>

    <div class="flex gap-2">
      <input
        ref="urlInput"
        :value="url"
        readonly
        type="text"
        class="input flex-1 min-w-0 text-xs"
        @click="selectUrl"
        @focus="selectUrl"
      />
      <SButton tiny type="info" :title="copyLabel" @click="copy">
        <ClipboardDocumentIcon class="w-5 h-5" />
      </SButton>
    </div>

    <p v-if="copyState" class="text-xs italic text-zinc-400">{{ copyState }}</p>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, useTemplateRef, watch } from 'vue'
import { ClipboardDocumentIcon } from '@heroicons/vue/24/outline'
import { NetworkAddress, buildOrigin, buildUrl } from '../network.ts'
import { copyText } from '../clipboard.ts'
import QrCode from './QrCode.vue'
import SButton from './SButton.vue'

const props = defineProps<{
  path: string
  addresses?: NetworkAddress[]
  port?: number | string | null
  isInBrowser?: boolean
  compact?: boolean
}>()

const copyLabel = 'Copy link'
const copyState = ref('')
const urlInput = useTemplateRef<HTMLInputElement>('urlInput')

// In the browser the page was served from an address the device demonstrably reached, so that is
// the only one worth offering. In the app, loopback is kept as a last resort so the link always works
const entries = computed<NetworkAddress[]>(() => {
  if (props.isInBrowser) {
    return [{ interface: 'This device', address: location.hostname }]
  }
  return [...(props.addresses ?? []), { interface: 'This computer', address: '127.0.0.1' }]
})

const selectedAddress = ref<string>(entries.value[0]?.address ?? '')

watch(entries, (newEntries) => {
  if (newEntries.some((entry) => entry.address === selectedAddress.value)) return
  selectedAddress.value = newEntries[0]?.address ?? ''
})

const origin = computed(() => {
  if (props.isInBrowser) return location.origin
  return buildOrigin(selectedAddress.value, props.port ?? '')
})

const url = computed(() => buildUrl(origin.value, props.path))

defineExpose({ url })

function selectUrl(event: Event) {
  (event.target as HTMLInputElement).select()
}

async function copy() {
  if (await copyText(url.value)) {
    copyState.value = 'Copied'
    setTimeout(() => { copyState.value = '' }, 2000)
    return
  }

  // No clipboard access (a phone on plain http), so hand the user a selection to copy themselves
  urlInput.value?.select()
  copyState.value = 'Press Ctrl/Cmd+C to copy'
}
</script>
