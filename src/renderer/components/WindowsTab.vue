<template>
  <div class="flex flex-col flex-1 gap-2 min-h-0 text-white">
    <screens-drag style="max-height: 50%" :screens="screens" v-model:windows="windows"></screens-drag>
    <card class="inline-block flex flex-col">
      <div class="flex flex-col gap-2">
        <div class="flex justify-between">
          <span class="text-2xl">Screen</span>
          <s-button tiny type="info" @click="getCountdownBounds">GET CURRENT POSITION</s-button>
        </div>

        <div class="inline-flex gap-2">
          <div class="inline-flex flex-col">
            <p class="text-base">Fullscreen</p>
            <select v-model="window.fullscreenOn" class="input text-black">
              <option :value="null">-</option>
              <option
                v-for="(screen, index) in screens"
                :key="screen.id"
                :value="screen.id"
              >
                Screen {{ index }}
                ({{ screen.size.width }}x{{ screen.size.height }}{{ screen.internal ? " Internal" : "" }})
              </option>
            </select>
          </div>
          <div class="inline-flex flex-col flex-1">
            <p class="text-base">X</p>
            <input v-model="window.x" type="number" class="input text-black w-full">
          </div>
          <div class="inline-flex flex-col flex-1">
            <p class="text-base">Y</p>
            <input v-model="window.y" type="number" class="input text-black w-full">
          </div>
          <div class="inline-flex flex-col flex-1">
            <p class="text-base">Width</p>
            <input v-model="window.width" type="number" class="input text-black w-full">
          </div>
          <div class="inline-flex flex-col flex-1">
            <p class="text-base">Height</p>
            <input v-model="window.height" type="number" class="input text-black w-full">
          </div>
        </div>
      </div>
    </card>
  </div>
</template>

<script>
import ScreensDrag from "./ScreensDrag";
import {DEFAULT_WINDOW_BOUNDS} from "../../common/constants";
import Store from "electron-store";
import { debounce } from "debounce";
import {ipcRenderer} from "electron";
import Card from "./Card";
import SButton from "./SButton";

const store = new Store()

export default {
  name: "WindowsTab",
  components: {
    ScreensDrag,
    Card,
    SButton
  },
  data() {
    return {
      window: store.get('window', DEFAULT_WINDOW_BOUNDS),
    }
  },
  props: {
    screens: Array,
  },
  computed: {
    windows: {
      get() {
        return [
          this.window,
        ]
      },
      set(value) {
        this.window = value[0];
      },
    }
  },
  methods: {
    setAndSave: debounce((self) => {
      store.set('window', {...self.window})
      /*
      store.set('window.x', parseInt(this.window.x))
      store.set('window.y', parseInt(this.window.y))
      store.set('window.width', parseInt(this.window.width))
      store.set('window.height', parseInt(this.window.height))*/

      ipcRenderer.send('window-updated');
    }, 50),
    async getCountdownBounds() {
      this.window = await ipcRenderer.invoke('countdown-bounds')
    }
  },
  watch: {
    'window.x'() { this.setAndSave(this) },
    'window.y'() { this.setAndSave(this) },
    'window.height'() { this.setAndSave(this) },
    'window.width'() { this.setAndSave(this) },
    'window.fullscreenOn'() { this.setAndSave(this) },
  }
}
</script>

<style scoped>

</style>
