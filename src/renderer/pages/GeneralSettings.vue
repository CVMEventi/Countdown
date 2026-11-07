<template>
  <BaseContainer>
    <TopBar />
    <div class="flex flex-1 gap-2 p-1 min-h-0 text-white">
      <card class="border flex flex-col p-0">
        <p class="text-lg uppercase">Presets (m)</p>
        <draggable item-key="index" v-model="settingsStore.settings.presets" handle=".handle"
                   class="flex flex-col gap-2 overflow-y-auto items-center pb-1 pr-2">
          <template #item="{element, index}">
            <div :key="index" class="inline-block w-35">
              <EditPreset v-model="settingsStore.settings.presets[index]" @delete="deletePreset(index)"></EditPreset>
            </div>
          </template>
        </draggable>
        <SButton tiny class="my-3" type="info" @click="addPreset">Add</SButton>
      </card>
      <card class="border flex flex-col gap-2">
        <div class="flex flex-col" style="min-width: 220px">
          <p class="text-lg uppercase">Close action</p>
          <select v-model="settingsStore.settings.closeAction" class="input p-2">
            <option v-for="action in CloseAction" :value="action">{{ getCloseActionLabel(action) }}</option>
          </select>
          <CheckBox class="mt-2" id="startHidden" v-model="settingsStore.settings.startHidden">Start hidden</CheckBox>
          <CheckBox class="mt-2" :class="{'opacity-50': !startupAvailable}" id="startAtLogin" :disabled="!startupAvailable" v-model="settingsStore.settings.startAtLogin">Start at login</CheckBox>
          <p v-if="!startupAvailable" class="text-xs text-zinc-400">Available in the packaged app.</p>
          <CheckBox class="mt-2" id="showMainWindowShortcut" v-model="settingsStore.settings.showMainWindowShortcut">Global shortcut to show main window ({{ showMainWindowShortcutLabel }})</CheckBox>
          <p id="globalShortcutStatus" class="mt-1 text-xs" role="status"
             :class="{'text-green-400': shortcutStatus === 'active' && settingsStore.settings.showMainWindowShortcut,
                       'text-amber-300': shortcutStatus === 'unavailable' && settingsStore.settings.showMainWindowShortcut,
                       'text-zinc-400': !settingsStore.settings.showMainWindowShortcut || shortcutStatus === 'registering'}">
            {{ shortcutStatusText }}
          </p>
        </div>
      </card>
    </div>
  </BaseContainer>
</template>

<script lang="ts" setup>
import draggable from 'vuedraggable'
import Card from '@common/components/Card.vue'
import SButton from '@common/components/SButton.vue'
import CheckBox from "@common/components/CheckBox.vue";
import EditPreset from "../components/EditPreset.vue";
import {CloseAction} from "../../common/config.ts";
import TopBar from '../components/TopBar.vue'
import BaseContainer from '../components/BaseContainer.vue'
import {useSettingsStore} from '../stores/settings.ts'
import {computed, onBeforeMount, onUnmounted, ref} from 'vue'
import type {GlobalShortcutStatus} from '../../common/shortcutStatus.ts'

const settingsStore = useSettingsStore()
const {api} = window
const startupAvailable = ref(false)
const shortcutStatus = ref<GlobalShortcutStatus>('disabled')
let unsubscribe = () => {}
const shortcutStatusText = computed(() => {
  if (!settingsStore.settings.showMainWindowShortcut) return 'Disabled'
  if (shortcutStatus.value === 'active') return 'Active'
  if (shortcutStatus.value === 'unavailable') return 'Unavailable: another app may be using this shortcut, or the desktop denied it. Turn it off and on to retry.'
  return 'Registering…'
})

onBeforeMount(async () => {
  unsubscribe = api.onGlobalShortcutStatus(status => {shortcutStatus.value = status})
  shortcutStatus.value = await api.getGlobalShortcutStatus()
  startupAvailable.value = await api.canStartAtLogin()
})
onUnmounted(() => unsubscribe())
const showMainWindowShortcutLabel = navigator.platform.startsWith('Mac') ? '⌘⇧M' : 'Ctrl+Shift+M'

function addPreset() {
  settingsStore.settings.presets.push(0)
}

function deletePreset(index: number) {
  settingsStore.settings.presets.splice(index, 1)
}

function getCloseActionLabel(closeAction: CloseAction): string {
  const labels = {
    'ASK': 'Ask',
    'HIDE': 'Hide',
    'CLOSE': 'Quit',
  }

  return labels[closeAction]
}
</script>

<style scoped>
.min-h-color {
  min-height: 27px;
}
</style>
