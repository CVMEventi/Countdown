<template>
  <div class="flex flex-col gap-2">
    <div  v-if="showNav" class="inline-flex gap-2">
      <TimersNavigation>
        <TimerTabButton
          v-for="(timer, key) in timers"
          :key="key"
          @click="emit('update:currentTimerId', key as string)"
          :active="currentTimerId === key as string"
        >
          {{ timer.name }}
        </TimerTabButton>
      </TimersNavigation>
      <OpenTimerInBrowserButton :server-port="serverPort" :timer-id="currentTimerId" :window-id="firstWindowId" :is-in-browser="isInBrowser" />
    </div>

    <div v-if="currentTimerId" class="flex gap-2 flex-wrap">
      <Card class="flex flex-col min-w-fit max-sm:flex-1">
        <div class="uppercase text-white flex flex-row justify-between">
          <span>Set</span>
          <div v-if="followingTimerId" class="flex flex-row items-center gap-1">
            <ArrowRightIcon class="w-6 h-6 inline-flex" />
            <span>{{ timers[followingTimerId].name }}</span>
          </div>
        </div>
        <TimeInput
          @update:modelValue="controller.set(currentTimerId, $event)"
          :modelValue="currentUpdate.setSeconds"
          color="white"
        />
        <div class="uppercase mt-2 text-white flex flex-row justify-between">
          <span>Count</span>
          <div class="flex flex-row items-center gap-1">
            <PlayPauseIcon v-if="displayUpdate.timerEndsAt" class="w-6 h-6 inline-flex" />
            <span>{{ displayUpdate.timerEndsAt }}</span>
          </div>
        </div>
        <TimeInput :modelValue="countSeconds" color="green" :disabled="true" />
        <div class="uppercase mt-2 text-white">Extra</div>
        <TimeInput color="red" :modelValue="displayUpdate.extraSeconds" :disabled="true" />
      </Card>

      <Card class="flex flex-col max-sm:flex-1" style="min-width: 250px">
        <SButton class="text-4xl mb-2 font-mono uppercase" @click="controller.start(currentTimerId)">Start</SButton>
        <SButton
          :disabled="currentUpdate.isReset"
          class="text-4xl mb-2 font-mono uppercase"
          type="warning"
          @click="controller.toggle(currentTimerId)"
        >
          {{ currentUpdate.isRunning ? 'Pause' : 'Resume' }}
        </SButton>
        <SButton class="text-4xl mb-2 font-mono uppercase" type="danger" @click="controller.reset(currentTimerId)">Reset</SButton>
        <div class="flex gap-2 justify-center">
          <Jog @up-click="jog(60)" @down-click="jog(-60)">
            <template v-slot:up><PlusIcon class="w-5 h-5 inline-flex" /></template>
            <template v-slot:down><MinusIcon class="w-5 h-5 inline-flex" /></template>
            1m
          </Jog>
          <Jog @up-click="jog(300)" @down-click="jog(-300)">
            <template v-slot:up><PlusIcon class="w-5 h-5 inline-flex" /></template>
            <template v-slot:down><MinusIcon class="w-5 h-5 inline-flex" /></template>
            5m
          </Jog>
          <Jog @up-click="jog(600)" @down-click="jog(-600)">
            <template v-slot:up><PlusIcon class="w-5 h-5 inline-flex" /></template>
            <template v-slot:down><MinusIcon class="w-5 h-5 inline-flex" /></template>
            10m
          </Jog>
        </div>
      </Card>

      <Card class="flex-1">
        <div class="uppercase text-white">Message</div>
        <div class="flex gap-2">
          <InputWithButton type="text" :model-value="message" @input="message = $event" @click="sendMessage">Send</InputWithButton>
          <SButton tiny type="danger" @click="deleteMessage">
            <TrashIcon class="w-5 h-5 inline-flex" />
          </SButton>
        </div>
      </Card>
    </div>

    <Card v-if="presets && presets.length" class="inline-flex gap-2 overflow-x-auto">
      <SButton
        v-for="(preset, index) in presets"
        :key="index"
        type="info"
        @click="controller.set(currentTimerId, preset * 60)"
      >
        {{ preset }}
      </SButton>
    </Card>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { PlayPauseIcon, PlusIcon, MinusIcon, TrashIcon, ArrowRightIcon } from '@heroicons/vue/24/outline'
import type { ITimerController } from '../TimerController.ts'
import type { TimerEngineUpdate, TimerEngineUpdates } from '../TimerInterfaces.ts'
import type { TimerSettings, Timers } from '../config.ts'
import Card from './Card.vue'
import SButton from './SButton.vue'
import TimeInput from './TimeInput.vue'
import Jog from './Jog.vue'
import InputWithButton from './InputWithButton.vue'
import TimerTabButton from './TimerTabButton.vue'
import TimersNavigation from './TimersNavigation.vue'
import OpenTimerInBrowserButton from '@common/components/OpenTimerInBrowserButton.vue'

const props = defineProps<{
  timers: Timers
  updates: TimerEngineUpdates
  currentTimerId: string | null
  controller: ITimerController
  presets?: number[]
  showNav?: boolean
  serverPort?: number
  isInBrowser: boolean
}>()

const showNav = computed(() => props.showNav ?? true)

const emit = defineEmits<{
  'update:currentTimerId': [timerId: string]
}>()

const message = ref('')

const emptyUpdate: TimerEngineUpdate = {
  setSeconds: 0,
  countSeconds: 0,
  currentSeconds: 0,
  extraSeconds: 0,
  secondsSetOnCurrentTimer: 0,
  isCountingUp: false,
  isExpiring: false,
  isReset: true,
  isRunning: false,
  timerEndsAt: null,
}

const currentUpdate = computed<TimerEngineUpdate>(() => {
  return props.currentTimerId ? (props.updates[props.currentTimerId] ?? emptyUpdate) : emptyUpdate
})

const followingTimerId = computed<string | null>(() => {
  if (!props.currentTimerId) return null
  const followTimer = (props.timers[props.currentTimerId] as TimerSettings)?.followTimer
  if (!Object.keys(props.timers).find((timerId) => timerId === followTimer)) return null
  if (currentUpdate.value.isReset && followTimer) return followTimer
  return null
})

const firstWindowId = computed(() => {
  if (Object.keys(props.timers).length === 0) return ""
  return Object.keys(props.timers[props.currentTimerId].windows)[0]
})

const displayUpdate = computed<TimerEngineUpdate>(() => {
  return (followingTimerId.value ? props.updates[followingTimerId.value] : null) ?? currentUpdate.value
})

const countSeconds = computed(() => {
  return displayUpdate.value.countSeconds > 0 ? displayUpdate.value.countSeconds : 0
})

function jog(seconds: number) {
  if (!props.currentTimerId) return
  if (!currentUpdate.value.isReset) {
    props.controller.jogCurrent(props.currentTimerId, seconds)
  } else {
    props.controller.jogSet(props.currentTimerId, seconds)
  }
}

function sendMessage() {
  if (!props.currentTimerId) return
  props.controller.sendMessage(props.currentTimerId, message.value)
}

function deleteMessage() {
  if (!props.currentTimerId) return
  message.value = ''
  props.controller.sendMessage(props.currentTimerId, '')
}
</script>
