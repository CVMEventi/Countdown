<template>
  <div class="flex flex-col gap-1">
    <p>Host</p>
    <input
      @click="($event.target as HTMLInputElement).select()"
      @focus="($event.target as HTMLInputElement).select()"
      v-model="config.host"
      :placeholder="DEFAULT_VMIX_CONFIG.host"
      class="input w-full">
    <p>Port</p>
    <input
      @click="($event.target as HTMLInputElement).select()"
      @focus="($event.target as HTMLInputElement).select()"
      v-model.number="config.port"
      class="input w-full">

    <details class="mt-3 pt-3 border-t border-zinc-700">
      <summary class="uppercase text-sm text-zinc-400 cursor-pointer select-none">Advanced</summary>
      <div class="flex flex-col gap-1 mt-2">
        <p>Username</p>
        <input
          @click="($event.target as HTMLInputElement).select()"
          @focus="($event.target as HTMLInputElement).select()"
          v-model="config.username"
          placeholder="Only if the vMix Web Controller has a password"
          class="input w-full">
        <p>Password</p>
        <input
          type="password"
          v-model="config.password"
          class="input w-full">
        <p>Poll interval (ms)</p>
        <input
          v-no-wheel
          type="number"
          min="50"
          @click="($event.target as HTMLInputElement).select()"
          @focus="($event.target as HTMLInputElement).select()"
          v-model.number="config.pollInterval"
          class="input w-full">
        <div class="flex items-center gap-1 mt-2">
          <CheckBox id="vmixFollowLooping" v-model="config.followLooping">Follow looping clips</CheckBox>
          <InfoTip text="Off by default so a looping background does not hold the timers for the whole show" />
        </div>
      </div>
    </details>
  </div>
</template>

<script lang="ts" setup>
import CheckBox from '@common/components/CheckBox.vue'
import {DEFAULT_VMIX_CONFIG, VMixProviderConfig} from '@common/playback.ts'
import InfoTip from '../InfoTip.vue'
import {vNoWheel} from '@common/directives/noWheel.ts'

const config = defineModel<VMixProviderConfig>({required: true})
</script>
