<template>
  <BaseContainer>
    <TopBar />
    <div class="flex flex-1 gap-2 p-1 min-h-0 text-white">
      <card class="flex flex-col w-[300px]">
        <p class="text-2xl pb-2">HTTP Server</p>
        <check-box id="httpServerEnabled" v-model="settingsStore.settings.remote.webServerEnabled">Enable</check-box>
        <p>Port</p>
        <input
          @click="($event.target as HTMLInputElement).select()"
          @focus="($event.target as HTMLInputElement).select()"
          v-model="settingsStore.settings.remote.webServerPort"
          :disabled="settingsStore.settings.remote.webServerEnabled"
          class="input w-full disabled:opacity-40 disabled:cursor-not-allowed">
        <p :class="[isRunning ? 'text-emerald-300' : 'text-red-300']">{{ isRunning ? `Server running on port ${currentPort}` : "Server not running" }}</p>
        <p class="text-sm italic">Last error: {{ lastError }}</p>
        <SButton
          :disabled="!settingsStore.settings.remote.webServerEnabled"
          class="uppercase mt-3"
          type="warning"
          @click="toggleHttpServer">
          <svg v-if="isLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>

          {{ !isLoading ? httpToggleText : '' }}
        </SButton>
      </card>
      <card class="flex flex-col w-[300px]">
        <p class="text-2xl pb-2">NDI</p>
        <CheckBox id="ndiEnabled" v-model="settingsStore.settings.remote.ndiEnabled">Enable</CheckBox>
        <CheckBox id="ndiAlpha" v-model="settingsStore.settings.remote.ndiAlpha">Alpha</CheckBox>
      </card>
      <card class="flex flex-col w-[300px]">
        <p class="text-2xl pb-2">OSC</p>
        <CheckBox id="oscEnabled" v-model="settingsStore.settings.remote.oscEnabled">Enable</CheckBox>
        <p>Port</p>
        <input
          @click="($event.target as HTMLInputElement).select()"
          @focus="($event.target as HTMLInputElement).select()"
          v-model="settingsStore.settings.remote.oscPort"
          :disabled="settingsStore.settings.remote.oscEnabled"
          class="input w-full disabled:opacity-40 disabled:cursor-not-allowed">
      </card>
    </div>
  </BaseContainer>
</template>

<script lang="ts" setup>
import {computed, onMounted, ref} from "vue";
import Card from "@common/components/Card.vue";
import CheckBox from "@common/components/CheckBox.vue";
const { api } = window
import SButton from "@common/components/SButton.vue";
import TopBar from '../components/TopBar.vue'
import BaseContainer from '../components/BaseContainer.vue'
import {useSettingsStore} from '../stores/settings.ts'

defineOptions({
  'name': 'RemoteTab',
});

const settingsStore = useSettingsStore()

let currentPort = ref('');
let isRunning = ref(false);
let lastError = ref('');
let isLoading = ref(false);

onMounted(async () => {
  const update = await api.isServerRunning();
  updateReceived(update)

  api.onWebserverUpdate((_event, update) => {
    updateReceived(update)
  })
});

function updateReceived(update: any) {
  isRunning.value = update.isRunning;
  lastError.value = update.lastError;
  currentPort.value = update.port;
}

async function toggleHttpServer() {
  isLoading.value = true;
  if (isRunning.value) {
    isRunning.value = await api.manageServer('stop')
  } else {
    isRunning.value = await api.manageServer('start', settingsStore.settings.remote.webServerPort)
  }
  isLoading.value = false;
}

let httpToggleText = computed(() => isRunning.value ? "Stop" : "Start");
</script>

<style scoped>

</style>
