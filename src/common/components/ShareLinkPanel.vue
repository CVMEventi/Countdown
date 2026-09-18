<template>
  <div class="flex flex-col gap-2">
    <div v-if="tabs.length > 1" class="flex gap-1">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="flex-1 text-xs uppercase py-1 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        :class="active === tab.id ? 'bg-zinc-600 text-white' : 'bg-zinc-700 text-zinc-400'"
        :disabled="!tab.usable"
        :title="tab.reason"
        @click="active = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <template v-if="active === LOCAL_ID && path !== undefined">
      <ShareUrlPanel
        v-if="localUsable"
        ref="localPanel"
        :path="path ?? ''"
        :addresses="addresses"
        :port="port"
        :is-in-browser="isInBrowser"
        :compact="compact"
      />
      <p v-else class="text-sm italic text-zinc-400">
        Start the web server in Remote settings to share this link.
      </p>
      <p v-if="localUsable" class="text-xs text-zinc-400">Scan with a device on the same network.</p>
    </template>

    <template v-else-if="activeRemote">
      <template v-if="activeRemote.availability === 'ready'">
        <p v-if="activeRemote.code" class="font-mono text-center tracking-widest text-sm select-all">
          {{ activeRemote.code }}
        </p>
        <QrUrlPanel :url="activeRemote.url" :compact="compact" />
        <p v-if="activeRemote.caution" class="text-xs text-amber-300">{{ activeRemote.caution }}</p>
      </template>
      <p v-else class="text-sm italic text-zinc-400">{{ activeRemote.reason }}</p>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, useTemplateRef, watch } from 'vue'
import { NetworkAddress } from '../network.ts'
// Types and one pure function only: this component is also built into the LAN remote bundle
import type { RemoteShareTarget } from '../webrtcStatus.ts'
import ShareUrlPanel from './ShareUrlPanel.vue'
import QrUrlPanel from './QrUrlPanel.vue'

const LOCAL_ID = 'local'

const props = defineProps<{
  path?: string
  addresses?: NetworkAddress[]
  port?: number | string | null
  isInBrowser?: boolean
  serverRunning?: boolean
  compact?: boolean
  // Undefined means the caller has no web remote to offer, so no tab strip appears at all
  remote?: RemoteShareTarget[]
}>()

const localPanel = useTemplateRef<InstanceType<typeof ShareUrlPanel>>('localPanel')

// In the browser the page itself is proof the server is up
const localUsable = computed(() => props.isInBrowser || (props.serverRunning ?? false))

const tabs = computed(() => {
  const list = props.path === undefined
    ? []
    : [{id: LOCAL_ID, label: 'Local', usable: localUsable.value, reason: ''}]

  ;(props.remote ?? []).forEach(target => {
    list.push({
      id: target.id,
      label: target.label,
      usable: target.availability === 'ready',
      reason: target.reason,
    })
  })

  return list
})

const active = ref(LOCAL_ID)

const activeRemote = computed(() => (props.remote ?? []).find(target => target.id === active.value) ?? null)

// A peer can drop while the popup is open, so never leave a dead tab selected
watch(tabs, (newTabs) => {
  if (newTabs.some(tab => tab.id === active.value && tab.usable)) return
  active.value = (newTabs.find(tab => tab.usable) ?? newTabs[0])?.id ?? LOCAL_ID
}, {immediate: true})

const url = computed(() => {
  if (active.value === LOCAL_ID) return localPanel.value?.url ?? ''
  return activeRemote.value?.url ?? ''
})

defineExpose({ url })
</script>
