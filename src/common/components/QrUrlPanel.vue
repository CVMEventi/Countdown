<template>
  <div class="flex flex-col gap-2">
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
      <SButton tiny type="info" title="Copy link" @click="copy">
        <ClipboardDocumentIcon class="w-5 h-5" />
      </SButton>
    </div>

    <p v-if="copyState" class="text-xs italic text-zinc-400">{{ copyState }}</p>
  </div>
</template>

<script lang="ts" setup>
import { ref, useTemplateRef } from 'vue'
import { ClipboardDocumentIcon } from '@heroicons/vue/24/outline'
import { copyText } from '../clipboard.ts'
import QrCode from './QrCode.vue'
import SButton from './SButton.vue'

const props = defineProps<{
  url: string
  compact?: boolean
}>()

const copyState = ref('')
const urlInput = useTemplateRef<HTMLInputElement>('urlInput')

function selectUrl(event: Event) {
  (event.target as HTMLInputElement).select()
}

async function copy() {
  if (await copyText(props.url)) {
    copyState.value = 'Copied'
    setTimeout(() => { copyState.value = '' }, 2000)
    return
  }

  // No clipboard access (a phone on plain http), so hand the user a selection to copy themselves
  urlInput.value?.select()
  copyState.value = 'Press Ctrl/Cmd+C to copy'
}
</script>
