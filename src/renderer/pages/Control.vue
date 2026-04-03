<template>
  <BaseContainer>
    <TopBar>
      <TimersNavigation>
        <TimerTabButton
          v-for="(timer, key) in settingsStore.settings.timers"
          :key="key"
          @click="globalStore.currentTimer = key as string"
          :active="globalStore.currentTimer === key as string"
        >
          {{ timer.name }}
        </TimerTabButton>
      </TimersNavigation>
      <OpenTimerInBrowserButton :server-port="settingsStore.settings.remote.webServerPort" :timer-id="globalStore.currentTimer" :is-in-browser="false" />
    </TopBar>
    <div class="p-1">
      <ControlPanel
        :timers="settingsStore.settings.timers"
        :updates="timersStore.updates"
        v-model:currentTimerId="globalStore.currentTimer"
        :controller="timerControl"
        :presets="settingsStore.settings.presets"
        :show-nav="false"
        :is-in-browser="false"
      />
    </div>
  </BaseContainer>
</template>

<script lang="ts" setup>
import { onMounted, watch } from 'vue'
const { api } = window;
// @ts-ignore
import { Howl } from 'howler'
import ControlPanel from '@common/components/ControlPanel.vue'
import TimersNavigation from '@common/components/TimersNavigation.vue'
import TimerTabButton from '@common/components/TimerTabButton.vue'
import BaseContainer from '../components/BaseContainer.vue'
import TopBar from '../components/TopBar.vue'
import { TimerControl } from '../TimerControl'
import { useTimersStore } from '../stores/timers.ts'
import { useSettingsStore } from '../stores/settings.ts'
import { useGlobalStore } from '../stores/global.ts'
import OpenTimerInBrowserButton from '@common/components/OpenTimerInBrowserButton.vue'

defineOptions({ name: 'index' })

const timerControl = new TimerControl()
const settingsStore = useSettingsStore()
const timersStore = useTimersStore()
const globalStore = useGlobalStore()

watch(() => settingsStore.settings.timers, (timers) => {
  if (globalStore.currentTimer === undefined) {
    globalStore.currentTimer = Object.keys(timers)[0]
  }
})

onMounted(async () => {
  globalStore.currentTimer = Object.keys(settingsStore.settings.timers)[0]
  api.onAudioPlay((_, audioFile, mimeType) => {
    const sound = new Howl({ src: [`data:${mimeType};base64,${audioFile}`] })
    sound.play()
  })
})
</script>
