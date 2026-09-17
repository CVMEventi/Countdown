<template>
  <BaseContainer>
    <TopBar />
    <div class="flex flex-1 gap-2 p-1 min-h-0 text-white">
      <card class="flex flex-col w-[300px] min-h-0 overflow-y-auto">
        <p class="text-2xl pb-2">HTTP Server</p>
        <check-box id="httpServerEnabled" v-model="settingsStore.settings.remote.webServerEnabled">Enable</check-box>
        <p>Port</p>
        <input
          @click="($event.target as HTMLInputElement).select()"
          @focus="($event.target as HTMLInputElement).select()"
          v-model="settingsStore.settings.remote.webServerPort"
          :disabled="isRunning"
          class="input w-full disabled:opacity-40 disabled:cursor-not-allowed">
        <p v-if="isRunning" class="text-xs italic text-zinc-400">Disable the server to change the port</p>
        <p :class="[isRunning ? 'text-emerald-300' : 'text-red-300']">{{ isRunning ? `Server running on port ${currentPort}` : "Server not running" }}</p>
        <p v-if="lastError" class="text-sm italic">Last error: {{ lastError }}</p>
        <SButton
          :disabled="!settingsStore.settings.remote.webServerEnabled"
          class="uppercase mt-3"
          type="warning"
          @click="restartHttpServer">
          <svg v-if="isLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>

          {{ !isLoading ? httpToggleText : '' }}
        </SButton>

        <div class="mt-3 pt-3 border-t border-zinc-700 flex flex-col gap-2">
          <p class="uppercase text-sm text-zinc-400">Connect</p>

          <p v-if="!isRunning" class="text-sm italic text-zinc-400">
            Start the server to get a connection address.
          </p>

          <template v-else>
            <ShareUrlPanel
              compact
              :path="remoteControlPath()"
              :addresses="webServerStore.addresses"
              :port="currentPort"
            />
            <p v-if="webServerStore.addresses.length === 0" class="text-sm italic text-zinc-400">
              No network connection found. Only this computer can reach the server.
            </p>
            <p v-else class="text-xs text-zinc-400">
              Scan with a device on the same network. Anyone on it can control the timers.
            </p>
          </template>
        </div>
      </card>
      <card class="flex flex-col w-[300px]">
        <p class="text-2xl pb-2">NDI</p>
        <CheckBox id="ndiEnabled" v-model="settingsStore.settings.remote.ndiEnabled">Enable</CheckBox>
        <CheckBox id="ndiAlpha" v-model="settingsStore.settings.remote.ndiAlpha">Alpha</CheckBox>
      </card>
      <card class="flex flex-col w-[300px]">
        <p class="text-2xl pb-2">OMT</p>
        <CheckBox id="omtEnabled" v-model="settingsStore.settings.remote.omtEnabled">Enable</CheckBox>
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
import {computed, ref} from "vue";
import Card from "@common/components/Card.vue";
import CheckBox from "@common/components/CheckBox.vue";
const { api } = window
import SButton from "@common/components/SButton.vue";
import ShareUrlPanel from "@common/components/ShareUrlPanel.vue";
import {remoteControlPath} from "@common/network.ts";
import TopBar from '../components/TopBar.vue'
import BaseContainer from '../components/BaseContainer.vue'
import {useSettingsStore} from '../stores/settings.ts'
import {useWebServerStore} from '../stores/webServer.ts'

defineOptions({
  'name': 'RemoteTab',
});

const settingsStore = useSettingsStore()
// Status is kept in a store, populated once in StoresUpdater, so the share links elsewhere in the
// app use the port the server actually bound rather than the one typed into the field
const webServerStore = useWebServerStore()

const currentPort = computed(() => webServerStore.port);
const isRunning = computed(() => webServerStore.isRunning);
const lastError = computed(() => webServerStore.lastError);
let isLoading = ref(false);

async function restartHttpServer() {
  isLoading.value = true;
  if (isRunning.value) {
    await api.manageServer('stop')
  }
  // The resulting webserver-update push is what settles the status in the store
  await api.manageServer('start', settingsStore.settings.remote.webServerPort)
  isLoading.value = false;
}

let httpToggleText = computed(() => isRunning.value ? "Restart" : "Start");
</script>

<style scoped>

</style>
