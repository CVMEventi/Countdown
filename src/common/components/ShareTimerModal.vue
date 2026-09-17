<template>
  <TransitionRoot as="template" :show="open">
    <Dialog class="relative z-10" @close="open = false">
      <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel class="relative transform overflow-hidden rounded-lg bg-zinc-900 text-white px-4 pb-4 pt-4 text-left shadow-xl transition-all my-8 w-full max-w-sm">
              <div class="flex flex-row justify-between items-center mb-3">
                <span class="text-xl uppercase">{{ title }}</span>
                <button type="button" class="relative rounded-md text-gray-300 hover:text-white focus:outline-hidden focus:ring-2 focus:ring-zinc-700" @click="open = false">
                  <XMarkIcon class="size-6" aria-hidden="true" />
                </button>
              </div>

              <p v-if="!canShare" class="text-sm italic text-zinc-400">
                Start the web server in Remote settings to share this link.
              </p>

              <template v-else>
                <ShareUrlPanel
                  ref="panel"
                  :path="path"
                  :addresses="addresses"
                  :port="port"
                  :is-in-browser="isInBrowser"
                />
                <p class="text-xs text-zinc-400 mt-2">Scan with a device on the same network.</p>
              </template>

              <div class="mt-4 flex gap-2 justify-end">
                <SButton v-if="canShare" type="info" @click="openInBrowser">Open in browser</SButton>
                <SButton type="info" @click="open = false">Close</SButton>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script lang="ts" setup>
import { computed, useTemplateRef } from 'vue'
import { Dialog, DialogPanel, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { NetworkAddress, countdownPath, remoteControlPath } from '../network.ts'
import ShareUrlPanel from './ShareUrlPanel.vue'
import SButton from './SButton.vue'

const props = defineProps<{
  timerId?: string | null
  windowId?: string
  addresses?: NetworkAddress[]
  port?: number | string | null
  isInBrowser: boolean
  serverRunning?: boolean
}>()

const open = defineModel('open', { type: Boolean, default: false })
const panel = useTemplateRef<InstanceType<typeof ShareUrlPanel>>('panel')

// In the browser the page itself is proof the server is up
const canShare = computed(() => props.isInBrowser || (props.serverRunning ?? false))

const title = computed(() => (props.timerId ? 'Share countdown' : 'Share remote'))

const path = computed(() => (props.timerId ? countdownPath(props.timerId, props.windowId) : remoteControlPath()))

function openInBrowser() {
  const url = panel.value?.url
  if (!url) return
  window.open(url, '_blank')
}
</script>
