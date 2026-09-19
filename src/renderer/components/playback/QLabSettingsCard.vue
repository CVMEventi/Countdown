<template>
  <div class="flex flex-col gap-1">
    <p>Host</p>
    <input
      @click="($event.target as HTMLInputElement).select()"
      @focus="($event.target as HTMLInputElement).select()"
      v-model="config.host"
      :placeholder="DEFAULT_QLAB_CONFIG.host"
      class="input w-full">

    <div class="flex items-center gap-1">
      <p>Cue</p>
      <InfoTip text="Leave empty to follow whichever cue is running. Give a cue number or name to pin this source to one cue, so a second source can watch a different cue in the same workspace." />
    </div>
    <input
      @click="($event.target as HTMLInputElement).select()"
      @focus="($event.target as HTMLInputElement).select()"
      v-model="config.cue"
      placeholder="Any running cue"
      class="input w-full">

    <p class="text-xs italic text-zinc-400 mt-1">
      In QLab, turn on "OSC replies" under Settings → Network.
    </p>

    <details class="mt-3 pt-3 border-t border-zinc-700">
      <summary class="uppercase text-sm text-zinc-400 cursor-pointer select-none">Advanced</summary>
      <div class="flex flex-col gap-1 mt-2">
        <p>QLab port</p>
        <input
          @click="($event.target as HTMLInputElement).select()"
          @focus="($event.target as HTMLInputElement).select()"
          v-model.number="config.port"
          class="input w-full">

        <div class="flex items-center gap-1">
          <p>Reply port</p>
          <InfoTip text="The local port Countdown asks from, so QLab's replies land back here. Leave it at 53001 unless that port is taken." />
        </div>
        <input
          @click="($event.target as HTMLInputElement).select()"
          @focus="($event.target as HTMLInputElement).select()"
          v-model.number="config.replyPort"
          class="input w-full">

        <div class="flex items-center gap-1">
          <p>Workspace</p>
          <InfoTip text="Leave empty to ask every workspace that is listening. Give a workspace id or name to target just one." />
        </div>
        <input
          @click="($event.target as HTMLInputElement).select()"
          @focus="($event.target as HTMLInputElement).select()"
          v-model="config.workspace"
          placeholder="Any workspace"
          class="input w-full">

        <p>Passcode</p>
        <input
          type="password"
          v-model="config.passcode"
          class="input w-full">

        <p>Poll interval (ms)</p>
        <input
          v-no-wheel
          type="number"
          min="100"
          @click="($event.target as HTMLInputElement).select()"
          @focus="($event.target as HTMLInputElement).select()"
          v-model.number="config.pollInterval"
          class="input w-full">
      </div>
    </details>
  </div>
</template>

<script lang="ts" setup>
import {DEFAULT_QLAB_CONFIG, QLabProviderConfig} from '@common/playback.ts'
import InfoTip from '../InfoTip.vue'
import {vNoWheel} from '@common/directives/noWheel.ts'

const config = defineModel<QLabProviderConfig>({required: true})
</script>
