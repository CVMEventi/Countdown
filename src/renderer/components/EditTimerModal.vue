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
                <div class="flex flex-row gap-2">
                  <Card class="inline-block border flex flex-col">
                    <p class="text-lg uppercase">Timer</p>
                    <CheckBox id="showHours" v-model="window.show.hours">Show hours</CheckBox>
                    <CheckBox id="pulseAtZero" v-model="window.pulseAtZero">Pulse at zero</CheckBox>
                    <CheckBox id="timerAlwaysOnTop" v-model="window.bounds.alwaysOnTop">Window always on top</CheckBox>

                    <p class="text-sm mt-2">Content at Reset</p>
                    <select v-model="window.contentAtReset" class="input p-2">
                      <option :value="ContentAtReset.Empty">Empty</option>
                      <option :value="ContentAtReset.Time">Time</option>
                      <option :value="ContentAtReset.Full">Full</option>
                    </select>
                  </Card>
                  <Card class="inline-block border flex flex-col">
                    <p class="text-lg uppercase">Timer UI</p>
                    <CheckBox id="showTimer" v-model="window.show.timer">Timer</CheckBox>
                    <CheckBox id="showProgress" v-model="window.show.progress">Progress</CheckBox>
                    <CheckBox id="showClock" v-model="window.show.clock">Clock</CheckBox>
                    <CheckBox id="showSecondsOnClock" v-model="window.show.secondsOnClock">Seconds on clock</CheckBox>
                    <CheckBox id="messageBoxFixedHeight" v-model="window.messageBoxFixedHeight">Message box fixed height</CheckBox>
                    <CheckBox id="use12HourClock" v-model="window.use12HourClock">12-Hour Clock</CheckBox>
                  </Card>
                  <Card class="inline-block border flex flex-col">
                    <div class="flex flex-col" style="min-width: 220px">
                      <p class="text-lg uppercase">Colors</p>
                      <ColorInput :alpha-channel="true" v-model="window.colors.background" default-value="#000000ff">
                        Background
                      </ColorInput>
                      <ColorInput :alpha-channel="true" v-model="window.colors.resetBackground" default-value="#000000ff">
                        Background at reset
                      </ColorInput>
                      <ColorInput v-model="window.colors.text" default-value="#ffffff">
                        Text
                      </ColorInput>
                      <ColorInput v-model="window.colors.timerFinishedText" default-value="#ff0000">
                        Text on timer finished
                      </ColorInput>
                      <ColorInput v-model="window.colors.clock" default-value="#ffffff">
                        Clock
                      </ColorInput>
                      <ColorInput v-model="window.colors.clockText" default-value="#ffffff">
                        Clock Text
                      </ColorInput>
                    </div>
                  </Card>
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
import {ref} from "vue";
import {ContentAtReset, WindowSettings} from '../../common/config.ts'
import {XMarkIcon} from '@heroicons/vue/24/outline'
import Card from './Card.vue'
import CheckBox from './CheckBox.vue'
import ColorInput from './ColorInput.vue'

const windowId = defineModel<string|null>('windowId')
const window = defineModel<WindowSettings|null>('window')

</script>
