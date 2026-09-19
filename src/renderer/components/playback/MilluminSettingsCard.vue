<template>
  <div class="flex flex-col gap-1">
    <div class="flex items-center gap-1">
      <p>Listen port</p>
      <InfoTip text="Millumin sends to Countdown. In Millumin open the Device manager (CMD+K), OSC tab, tick 'API feedback' and point it at this machine and port." />
    </div>
    <input
      @click="($event.target as HTMLInputElement).select()"
      @focus="($event.target as HTMLInputElement).select()"
      v-model.number="config.port"
      class="input w-full">

    <details class="mt-3 pt-3 border-t border-zinc-700">
      <summary class="uppercase text-sm text-zinc-400 cursor-pointer select-none">Advanced</summary>
      <div class="flex flex-col gap-1 mt-2">
        <div class="flex items-center gap-1">
          <p>Layer</p>
          <InfoTip text="Leave empty to follow whichever layer is playing. Set a layer name to pin the timers to it, so a background loop cannot take them over." />
        </div>
        <input
          @click="($event.target as HTMLInputElement).select()"
          @focus="($event.target as HTMLInputElement).select()"
          v-model="config.layer"
          placeholder="Any layer"
          class="input w-full">
        <div class="flex items-center gap-1">
          <p>Silence timeout (ms)</p>
          <InfoTip text="A playing layer keeps sending its time. If nothing arrives for this long Millumin is treated as gone and the timers go back to their own count. A paused clip is held until Millumin says it stopped." />
        </div>
        <input
          v-no-wheel
          type="number"
          min="250"
          @click="($event.target as HTMLInputElement).select()"
          @focus="($event.target as HTMLInputElement).select()"
          v-model.number="config.playingTimeout"
          class="input w-full">
        <div class="flex items-center gap-1 mt-2">
          <CheckBox id="milluminLogMessages" v-model="config.logMessages">Log every OSC message</CheckBox>
          <InfoTip text="Prints each packet Millumin sends to the app console. Leave off in production: the time messages arrive many times a second." />
        </div>
      </div>
    </details>
  </div>
</template>

<script lang="ts" setup>
import CheckBox from '@common/components/CheckBox.vue'
import {MilluminProviderConfig} from '@common/playback.ts'
import InfoTip from '../InfoTip.vue'
import {vNoWheel} from '@common/directives/noWheel.ts'

const config = defineModel<MilluminProviderConfig>({required: true})
</script>
