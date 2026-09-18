<template>
  <BaseContainer>
    <TopBar />
    <div class="flex flex-1 gap-2 p-1 min-h-0 text-white">
      <div class="flex flex-col gap-2 flex-1 min-w-[300px] min-h-0 overflow-y-auto">
        <card class="flex flex-col w-full">
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
      </div>
      <div class="flex flex-col gap-2 flex-1 min-w-[300px] min-h-0 overflow-y-auto">
        <card class="flex flex-col w-full">
          <p class="text-2xl pb-2">Web Remote</p>
          <CheckBox id="webrtcEnabled" v-model="remote.webrtcEnabled">Enable</CheckBox>

          <p class="text-xs italic text-zinc-400 mt-1">
            Connects a browser to this app directly, from anywhere. Anyone with the code can control
            the timers.
          </p>

          <p class="text-sm mt-2" :class="webRtcStateClass">{{ webRtcStateText }}</p>
          <p v-if="webRtcStore.lastError" class="text-xs italic text-zinc-400">{{ webRtcStore.lastError }}</p>

          <div class="mt-3 pt-3 border-t border-zinc-700">
            <PairingPanel
              :control-code="webRtcStore.controlCode"
              :view-code="webRtcStore.viewCode"
              :spa-url="remote.webrtcSpaUrl"
              :clients="webRtcStore.clients"
              @rotate="rotateCode"
              @revoke="revokeClient"
            />
          </div>

          <p class="mt-3">Remote page address</p>
          <input
            @click="($event.target as HTMLInputElement).select()"
            @focus="($event.target as HTMLInputElement).select()"
            v-model="remote.webrtcSpaUrl"
            placeholder="https://example.com/remote"
            class="input w-full">

          <details class="mt-3 pt-3 border-t border-zinc-700">
            <summary class="uppercase text-sm text-zinc-400 cursor-pointer select-none">Advanced</summary>

            <div class="flex flex-col gap-2 mt-2">
              <p class="uppercase text-xs text-zinc-400">Signaling</p>
              <input
                v-model="remote.webrtcSignaling.host"
                placeholder="Host (blank for the public broker)"
                class="input w-full">
              <input
                v-model.number="signalingPort"
                placeholder="Port"
                class="input w-full">
              <input v-model="remote.webrtcSignaling.path" placeholder="Path" class="input w-full">
              <input v-model="remote.webrtcSignaling.key" placeholder="Key" class="input w-full">
              <CheckBox id="webrtcSignalingSecure" v-model="remote.webrtcSignaling.secure">Use TLS</CheckBox>

              <p class="uppercase text-xs text-zinc-400 mt-2">ICE servers</p>
              <div
                v-for="(server, index) in remote.webrtcIceServers"
                :key="index"
                class="flex flex-col gap-1 border border-zinc-700 rounded p-2">
                <input
                  :value="urlsToText(server.urls)"
                  @input="setUrls(index, ($event.target as HTMLInputElement).value)"
                  placeholder="stun: or turn: URLs, comma separated"
                  class="input w-full text-xs">
                <input v-model="server.username" placeholder="Username (TURN only)" class="input w-full text-xs">
                <input v-model="server.credential" placeholder="Credential (TURN only)" class="input w-full text-xs">
                <SButton tiny type="danger" class="self-end" @click="removeIceServer(index)">Remove</SButton>
              </div>
              <SButton tiny type="info" @click="addIceServer">Add ICE server</SButton>

              <p class="uppercase text-xs text-zinc-400 mt-2">Connection</p>
              <select v-model="remote.webrtcIceTransportPolicy" class="input w-full">
                <option value="all">Direct when possible</option>
                <option value="relay">Force relay (test TURN)</option>
              </select>

              <p class="uppercase text-xs text-zinc-400 mt-2">Code</p>
              <select v-model="remote.webrtcCodeRotation" class="input w-full">
                <option value="session">New code each start</option>
                <option value="manual">Keep the same code</option>
              </select>
              <CheckBox id="webrtcRequireApproval" v-model="remote.webrtcRequireApproval">
                Ask before a new device connects
              </CheckBox>
            </div>
          </details>
        </card>
      </div>
      <div class="flex flex-col gap-2 flex-1 min-w-[300px] min-h-0 overflow-y-auto">
        <card class="flex flex-col w-full">
          <p class="text-2xl pb-2">NDI</p>
          <CheckBox id="ndiEnabled" v-model="settingsStore.settings.remote.ndiEnabled">Enable</CheckBox>
          <CheckBox id="ndiAlpha" v-model="settingsStore.settings.remote.ndiAlpha">Alpha</CheckBox>
        </card>
        <card class="flex flex-col w-full">
          <p class="text-2xl pb-2">OMT</p>
          <CheckBox id="omtEnabled" v-model="settingsStore.settings.remote.omtEnabled">Enable</CheckBox>
        </card>
        <card class="flex flex-col w-full">
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
import PairingPanel from "@common/components/PairingPanel.vue";
import {remoteControlPath} from "@common/network.ts";
import TopBar from '../components/TopBar.vue'
import BaseContainer from '../components/BaseContainer.vue'
import {useSettingsStore} from '../stores/settings.ts'
import {useWebServerStore} from '../stores/webServer.ts'
import {useWebRtcStore} from '../stores/webRtc.ts'

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

const remote = computed(() => settingsStore.settings.remote);

const webRtcStore = useWebRtcStore();

const webRtcStateText = computed(() => {
  if (!webRtcStore.enabled) return 'Disabled';
  switch (webRtcStore.state) {
    case 'online': return 'Online — ready for connections';
    case 'signaling': return 'Contacting signaling server…';
    case 'failed': return 'Could not start';
    default: return 'Starting…';
  }
});

const webRtcStateClass = computed(() => {
  if (!webRtcStore.enabled) return 'text-zinc-400';
  if (webRtcStore.state === 'online') return 'text-emerald-300';
  if (webRtcStore.state === 'failed') return 'text-red-300';
  return 'text-amber-300';
});

async function rotateCode() {
  webRtcStore.apply(await api.webrtcRotateCode());
}

async function revokeClient(clientId: string) {
  await api.webrtcRevoke(clientId);
}

// The config keeps port null for "use the scheme default", which an empty input should mean too
const signalingPort = computed({
  get: () => remote.value.webrtcSignaling.port ?? undefined,
  set: (value?: number) => {
    remote.value.webrtcSignaling.port = Number.isFinite(value) ? (value as number) : null;
  },
});

function urlsToText(urls: string | string[]) {
  return Array.isArray(urls) ? urls.join(', ') : urls;
}

function setUrls(index: number, text: string) {
  remote.value.webrtcIceServers[index].urls = text
    .split(',')
    .map(url => url.trim())
    .filter(url => url !== '');
}

function addIceServer() {
  remote.value.webrtcIceServers.push({urls: []});
}

function removeIceServer(index: number) {
  remote.value.webrtcIceServers.splice(index, 1);
}
</script>

<style scoped>

</style>
