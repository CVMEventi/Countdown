<template>
  <div class="flex flex-col gap-1">
    <div class="flex items-center gap-1">
      <p>Listen port</p>
      <InfoTip text="OSCPoint sends to Countdown. In PowerPoint open the OSCPoint ribbon tab and set the remote host to this machine and the remote port to this number." />
    </div>
    <input
      @click="($event.target as HTMLInputElement).select()"
      @focus="($event.target as HTMLInputElement).select()"
      v-model.number="config.port"
      class="input w-full">

    <p class="text-xs italic text-zinc-400 mt-1">
      Counts down the media on the current slide. One add-in reports one deck, so give a second
      presentation machine its own source and port.
    </p>

    <details class="mt-3 pt-3 border-t border-zinc-700">
      <summary class="uppercase text-sm text-zinc-400 cursor-pointer select-none">Advanced</summary>
      <div class="flex flex-col gap-1 mt-2">
        <div class="flex items-center gap-1">
          <p>Silence timeout (ms)</p>
          <InfoTip text="Playing media repeats its time every 500ms. If nothing arrives for this long OSCPoint is treated as gone and the timers go back to their own count. Paused media is held until OSCPoint says it stopped." />
        </div>
        <input
          v-no-wheel
          type="number"
          min="500"
          @click="($event.target as HTMLInputElement).select()"
          @focus="($event.target as HTMLInputElement).select()"
          v-model.number="config.playingTimeout"
          class="input w-full">
        <div class="flex items-center gap-1 mt-2">
          <CheckBox :id="`oscpointLogMessages-${uid}`" v-model="config.logMessages">Log every OSC message</CheckBox>
          <InfoTip text="Prints each packet OSCPoint sends to the app console. Leave off in production: the media messages arrive twice a second." />
        </div>
      </div>
    </details>
  </div>
</template>

<script lang="ts" setup>
import {useId} from 'vue'
import CheckBox from '@common/components/CheckBox.vue'
import {OscPointProviderConfig} from '@common/playback.ts'
import InfoTip from '../InfoTip.vue'
import {vNoWheel} from '@common/directives/noWheel.ts'

const config = defineModel<OscPointProviderConfig>({required: true})
// Several sources of one kind can be on screen at once, so the label ids have to differ
const uid = useId()
</script>
