<template>
  <div class="flex flex-col gap-1">
    <p>Host</p>
    <input
      @click="($event.target as HTMLInputElement).select()"
      @focus="($event.target as HTMLInputElement).select()"
      v-model="config.host"
      :placeholder="DEFAULT_GRANDSHOW_CONFIG.host"
      class="input w-full">

    <div class="flex items-center gap-1">
      <p>Node</p>
      <InfoTip text="Leave empty to follow whichever node is playing, top window first. Give a row like 2 to pin a window, or a row and column like 1,3 to pin one node." />
    </div>
    <input
      @click="($event.target as HTMLInputElement).select()"
      @focus="($event.target as HTMLInputElement).select()"
      v-model="config.node"
      placeholder="Any playing node"
      class="input w-full">

    <p class="text-xs italic text-zinc-400 mt-1">
      GrandShow EE only. Turn on central control under Settings → Software Settings → Central Control.
    </p>

    <details class="mt-3 pt-3 border-t border-zinc-700">
      <summary class="uppercase text-sm text-zinc-400 cursor-pointer select-none">Advanced</summary>
      <div class="flex flex-col gap-1 mt-2">
        <p>GrandShow port</p>
        <input
          @click="($event.target as HTMLInputElement).select()"
          @focus="($event.target as HTMLInputElement).select()"
          v-model.number="config.port"
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
import {DEFAULT_GRANDSHOW_CONFIG, GrandShowProviderConfig} from '@common/playback.ts'
import InfoTip from '../InfoTip.vue'
import {vNoWheel} from '@common/directives/noWheel.ts'

const config = defineModel<GrandShowProviderConfig>({required: true})
</script>
