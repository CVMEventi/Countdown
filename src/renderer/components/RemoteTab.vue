<template>
  <div class="flex flex-1 gap-2 min-h-0 text-white">
    <card class="inline-block flex flex-col w-[300px]">
      <p class="text-2xl pb-2">HTTP Server</p>
      <check-box id="httpServerEnabled" v-model="httpServerEnabled">Enable</check-box>
      <p>Port</p>
      <input
        @click="$event.target.select()"
        @focus="$event.target.select()"
        v-model="httpServerPort"
        class="input text-black w-full">
      <p :class="[isRunning ? 'text-emerald-300' : 'text-red-300']">{{ this.isRunning ? `Server running on port ${currentPort}` : "Server not running" }}</p>
      <p class="text-sm italic">Last error: {{ this.lastError }}</p>
      <s-button
        :disabled="!this.httpServerEnabled"
        class="uppercase mt-3"
        type="warning"
        @click="toggleHttpServer">
        <svg v-if="isLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>

        {{ !this.isLoading ? httpToggleText : '' }}
      </s-button>
    </card>
  </div>
</template>

<script>
import Card from "./Card";
import CheckBox from "./CheckBox";
import { ipcRenderer } from "electron";
import SButton from "./SButton";
import Store from 'electron-store';
import { DEFAULT_WEBSERVER_ENABLED, DEFAULT_WEBSERVER_PORT } from "../../common/constants";
import ScreensDrag from "./ScreensDrag";

const store = new Store();

export default {
  name: "RemoteTab",
  components: {
    ScreensDrag,
    SButton,
    Card,
    CheckBox
  },
  data() {
    return {
      httpServerEnabled: store.get('settings.webServerEnabled', DEFAULT_WEBSERVER_ENABLED),
      httpServerPort: store.get('settings.webServerPort', DEFAULT_WEBSERVER_PORT),
      currentPort: '',
      isRunning: false,
      lastError: {
        type: String,
        required: false
      },
      isLoading: false,
    }
  },
  async mounted() {
    const update = await ipcRenderer.invoke('server-running');
    this.updateReceived(update)

    ipcRenderer.on('webserver-update', (event, update) => {
      this.updateReceived(update)
    })
  },
  methods: {
    updateReceived(update) {
      const { isRunning, lastError, port } = update;
      this.isRunning =  isRunning;
      this.lastError = lastError;
      this.currentPort = port;
    },
    async save() {
      store.set('settings.webServerEnabled', this.httpServerEnabled)
      store.set('settings.webServerPort', parseInt(this.httpServerPort))

      if (this.httpServerEnabled
        && parseInt(this.httpServerPort) !== parseInt(this.currentPort)
        && this.isRunning) {
        this.isRunning = await ipcRenderer.invoke('webserver-manager', 'stop')
        this.isRunning = await ipcRenderer.invoke('webserver-manager', 'start')
      }

      if (!this.httpServerEnabled
        && this.isRunning) {
        this.isRunning = await ipcRenderer.invoke('webserver-manager', 'stop');
      }

      this.$emit('settings-updated')
      ipcRenderer.send('settings-updated')
    },
    async toggleHttpServer() {
      this.isLoading = true;
      if (this.isRunning) {
        this.isRunning = await ipcRenderer.invoke('webserver-manager', 'stop')
      } else {
        this.isRunning = await ipcRenderer.invoke('webserver-manager', 'start')
      }
      this.isLoading = false;
    },
  },
  computed: {
    httpToggleText() {
      return this.isRunning ? "Stop" : "Start"
    },
  }
}
</script>

<style scoped>

</style>
