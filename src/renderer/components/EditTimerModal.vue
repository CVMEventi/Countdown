<template>
  <TransitionRoot as="template" :show="windowId !== null">
    <Dialog class="relative z-10" @close="windowId = null">
      <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel class="relative transform overflow-hidden rounded-lg bg-zinc-900 text-white px-4 pb-4 pt-4 text-left shadow-xl transition-all my-8 m-6 overflow-visible">
              <div v-if="window">
                <div class="flex flex-row justify-between mb-2">
                  <span class="text-2xl uppercase">Settings</span>
                  <button type="button" class="relative rounded-md text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-700" @click="windowId = null">
                    <XMarkIcon class="size-6" aria-hidden="true" />
                  </button>
                </div>
                <div class="flex flex-col gap-2">
                  <div class="flex flex-row gap-2 items-start">
                    <TimerOptionsCard v-model="window" />
                    <TimerUICard v-model="window" />
                  </div>
                  <TimerColorsCard v-model="window" />
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script lang="ts" setup>
import { Dialog, DialogPanel, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { WindowSettings } from '../../common/config.ts'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import TimerOptionsCard from './TimerOptionsCard.vue'
import TimerUICard from './TimerUICard.vue'
import TimerColorsCard from './TimerColorsCard.vue'

const windowId = defineModel<string|null>('windowId')
const window = defineModel<WindowSettings|null>('window')
</script>
