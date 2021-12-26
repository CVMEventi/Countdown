<template>
  <card class="flex flex-1 gap-2 min-h-0">
    <card class="inline-block border flex flex-col">
      <p class="text-2xl">Screen</p>
      <select v-model="currentScreen" class="border rounded p-2">
        <option :value="null">-</option>
        <option
          v-for="(screen, index) in screens"
          :key="screen.id"
          :value="screen"
        >
          Screen {{ index }}
          ({{ screen.size.width }}x{{ screen.size.height }}{{ screen.internal ? " Internal" : "" }})
        </option>
      </select>
      <hr class="my-3">
      <p class="text-2xl">Colors</p>
      <p class="text-base">Background</p>
      <input v-model="backgroundColor" type="color" placeholder="#000000">
      <p class="text-base">Text</p>
      <input v-model="textColor" type="color" placeholder="#000000">
      <p class="text-base">Text on timer finished</p>
      <input v-model="timerFinishedTextColor" type="color" placeholder="#000000">
      <p class="text-base">Clock</p>
      <input v-model="clockColor" type="color" placeholder="#000000">
      <p class="text-base">Clock Text</p>
      <input v-model="clockTextColor" type="color" placeholder="#000000">
    </card>
    <card class="inline-block border flex flex-col">
      <p class="text-2xl">Presets</p>
      <draggable v-model="presets" handle=".handle" class="flex flex-col my-3 gap-2 overflow-y-scroll items-center">
        <div v-for="(preset, index) in presets" :key="index" class="inline-block" style="max-width: 140px">
          <i class="mdi mdi-menu-swap cursor-pointer handle" />
          <input v-model="presets[index]" class="input text-center" style="max-width: 80px">
          <i class="mdi mdi-trash-can cursor-pointer" @click="deletePreset(index)" />
        </div>
      </draggable>
      <s-button type="info" @click.native="addPreset">Add</s-button>
    </card>
    <card>
      <p class="text-2xl">Timer</p>
      <div>
        <input id="stopTimerAtZero" v-model="stopTimerAtZero" type="checkbox">
        <label for="stopTimerAtZero">Stop timer at 0</label>
      </div>
    </card>
    <div class="flex-1 flex justify-end content-end">
      <div class="flex flex-col justify-end">
        <s-button type="warning" @click.native="save">Save</s-button>
      </div>
    </div>
  </card>
</template>

<script>
import Store from 'electron-store'
import { ipcRenderer } from 'electron'
import draggable from 'vuedraggable'
import Card from '../components/Card'
import SButton from './SButton'

const store = new Store()

export default {
  name: 'SettingsTab',
  components: {
    SButton,
    Card,
    draggable
  },
  props: {
    screens: {
      type: Array,
      default: () => []
    },
    selectedScreen: {
      type: Object,
      default: null
    }
  },
  data () {
    return {
      backgroundColor: store.get('settings.backgroundColor'),
      textColor: store.get('settings.textColor'),
      timerFinishedTextColor: store.get('settings.timerFinishedTextColor'),
      clockColor: store.get('settings.clockColor'),
      clockTextColor: store.get('settings.clockTextColor'),
      presets: store.get('settings.presets'),
      stopTimerAtZero: store.get('settings.stopTimerAtZero')
    }
  },
  computed: {
    currentScreen: {
      get () {
        return this.selectedScreen
      },
      set (newValue) {
        this.$emit('screen-set', newValue)
      }
    }
  },
  methods: {
    save () {
      if (CSS.supports('color', this.backgroundColor)) {
        store.set('settings.backgroundColor', this.backgroundColor)
      }

      if (CSS.supports('color', this.textColor)) {
        store.set('settings.textColor', this.textColor)
      }

      if (CSS.supports('color', this.timerFinishedTextColor)) {
        store.set('settings.timerFinishedTextColor', this.timerFinishedTextColor)
      }

      if (CSS.supports('color', this.clockColor)) {
        store.set('settings.clockColor', this.clockColor)
      }

      if (CSS.supports('color', this.clockTextColor)) {
        store.set('settings.clockTextColor', this.clockTextColor)
      }

      store.set('settings.presets', this.presets)
      store.set('settings.stopTimerAtZero', this.stopTimerAtZero)

      this.$emit('settings-updated')
      ipcRenderer.send('settings-updated')
    },
    addPreset () {
      this.presets.push(0)
    },
    deletePreset (index) {
      this.presets.splice(index, 1)
    }
  }
}
</script>

<style scoped>

</style>
