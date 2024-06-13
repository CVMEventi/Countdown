<template>
  <div class="flex flex-col flex-1 gap-2 min-h-0 text-white p-1">
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
            <select v-model="window.fullscreenOn" class="block text-black w-full pl-3 pr-10 py-1.5 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
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

<script lang="ts" setup>
import ScreensDrag from "./ScreensDrag";
import {DEFAULT_WINDOW_BOUNDS, WindowBounds} from "../../common/config";
import Store from "electron-store";
import {ipcRenderer} from "electron";
import Card from "./Card";
import SButton from "./SButton";
import {computed, ref, watch} from "vue";
import Display = Electron.Display;

const store = new Store()

ipcRenderer.on('screens-updated', () => {
  console.log('display updated')
})

defineOptions({
  name: 'WindowsTab',
});

let window = ref<WindowBounds>(store.get('window', DEFAULT_WINDOW_BOUNDS) as WindowBounds);

export interface Props {
  screens: Display[]
}

const props = defineProps<Props>();
let windows = computed({
  get() {
    return [
      window.value,
    ]
  },
  set(value) {
    window.value = value[0];
  },
})

const setAndSave = async () => {
  store.set('window', {...window.value});

  ipcRenderer.send('window-updated');
};

async function getCountdownBounds() {
  window.value = await ipcRenderer.invoke('countdown-bounds')
}

watch(window, () => {
  setAndSave();
}, {deep: true})
</script>

<style scoped>

</style>
