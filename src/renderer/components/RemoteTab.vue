<template>
  <div class="flex flex-1 gap-2 p-1 min-h-0 text-white">
    <card class="flex flex-col w-[300px]">
      <p class="text-2xl pb-2">HTTP Server</p>
      <check-box id="httpServerEnabled" v-model="httpServerEnabled">Enable</check-box>
      <p>Port</p>
      <input
        @click="($event.target as HTMLInputElement).select()"
        @focus="($event.target as HTMLInputElement).select()"
        v-model="httpServerPort"
        class="input text-black w-full">
      <p :class="[isRunning ? 'text-emerald-300' : 'text-red-300']">{{ isRunning ? `Server running on port ${currentPort}` : "Server not running" }}</p>
      <p class="text-sm italic">Last error: {{ lastError }}</p>
      <s-button
        :disabled="!httpServerEnabled"
        class="uppercase mt-3"
        type="warning"
        @click="toggleHttpServer">
        <svg v-if="isLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>

        {{ !isLoading ? httpToggleText : '' }}
      </s-button>
    </card>
    <card class="flex flex-col w-[300px]">
      <p class="text-2xl pb-2">NDI (Beta)</p>
      <check-box id="ndiEnabled" v-model="ndiEnabled">Enable</check-box>
      <check-box id="ndiAlpha" v-model="ndiAlpha">Alpha</check-box>
    </card>
    <card class="flex flex-col w-[300px]">
      <p class="text-2xl pb-2">OSC</p>
      <check-box id="oscEnabled" v-model="oscEnabled">Enable</check-box>
      <p>Port</p>
      <input
        @click="($event.target as HTMLInputElement).select()"
        @focus="($event.target as HTMLInputElement).select()"
        v-model="oscPort"
        class="input text-black w-full">
    </card>
  </div>
</template>

<script lang="ts" setup>
import {computed, defineComponent, defineOptions, onBeforeMount, onMounted, ref} from "vue";
import Card from "./Card.vue";
import CheckBox from "./CheckBox.vue";
import { ipcRenderer } from "electron";
import SButton from "./SButton.vue";
import {
  DEFAULT_NDI_ALPHA,
  DEFAULT_NDI_ENABLED, DEFAULT_OSC_ENABLED, DEFAULT_OSC_PORT, DEFAULT_STORE,
  DEFAULT_WEBSERVER_ENABLED,
  DEFAULT_WEBSERVER_PORT, RemoteSettings
} from "../../common/config";
import * as http from "node:http";

defineOptions({
  'name': 'RemoteTab',
});

const emit = defineEmits<{
  'settings-updated': []
}>();

let httpServerEnabled = ref(DEFAULT_WEBSERVER_ENABLED);
let httpServerPort = ref(DEFAULT_WEBSERVER_PORT);
let ndiEnabled = ref(DEFAULT_NDI_ENABLED);
let ndiAlpha = ref(DEFAULT_NDI_ALPHA);
let oscEnabled = ref(DEFAULT_OSC_ENABLED);
let oscPort = ref(DEFAULT_OSC_PORT);
let currentPort = ref('');
let isRunning = ref(false);
let lastError = ref('');
let isLoading = ref(false);

onBeforeMount(async () => {
  const remoteSettings: RemoteSettings = await ipcRenderer.invoke('settings:get', 'remote')
  httpServerEnabled.value = remoteSettings.webServerEnabled
  httpServerPort.value = remoteSettings.webServerPort
  ndiEnabled.value = remoteSettings.ndiEnabled
  ndiAlpha.value = remoteSettings.ndiAlpha
  oscEnabled.value = remoteSettings.oscEnabled
  oscPort.value = remoteSettings.oscPort

  const update = await ipcRenderer.invoke('server-running');
  updateReceived(update)
})

onMounted(async () => {
  ipcRenderer.on('webserver-update', (event, update) => {
    updateReceived(update)
  })
});

function updateReceived(update: any) {
  isRunning.value =  update.isRunning;
  lastError.value = update.lastError;
  currentPort.value = update.port;
}

async function save() {
  const newRemoteSettings: RemoteSettings = {
    webServerEnabled: httpServerEnabled.value,
    webServerPort: httpServerPort.value,
    ndiEnabled: ndiEnabled.value,
    ndiAlpha: ndiAlpha.value,
    oscEnabled: oscEnabled.value,
    oscPort: oscPort.value,
  }

  await ipcRenderer.invoke('settings:set', 'remote', JSON.stringify(newRemoteSettings));

  if (httpServerEnabled.value
    && httpServerPort.value !== parseInt(currentPort.value)
    && isRunning.value) {
    isRunning.value = await ipcRenderer.invoke('webserver-manager', 'stop')
    isRunning.value = await ipcRenderer.invoke('webserver-manager', 'start', httpServerPort.value)
  }

  if (!httpServerEnabled.value
    && isRunning.value) {
    isRunning.value = await ipcRenderer.invoke('webserver-manager', 'stop');
  }

  emit('settings-updated')
}

async function toggleHttpServer() {
  isLoading.value = true;
  if (isRunning.value) {
    isRunning.value = await ipcRenderer.invoke('webserver-manager', 'stop')
  } else {
    isRunning.value = await ipcRenderer.invoke('webserver-manager', 'start', httpServerPort.value)
  }
  isLoading.value = false;
}

let httpToggleText = computed(() => isRunning.value ? "Stop" : "Start");

defineExpose({
  save,
});
</script>

<style scoped>

</style>
