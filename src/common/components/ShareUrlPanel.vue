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

    <QrUrlPanel :url="url" :compact="compact" />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { NetworkAddress, buildOrigin, buildUrl } from '../network.ts'
import QrUrlPanel from './QrUrlPanel.vue'

const props = defineProps<{
  path: string
  addresses?: NetworkAddress[]
  port?: number | string | null
  isInBrowser?: boolean
  compact?: boolean
}>()

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
</script>
