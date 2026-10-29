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
import {onBeforeMount, ref} from 'vue'

const settingsStore = useSettingsStore()
const {api} = window
const startupAvailable = ref(false)

onBeforeMount(async () => {
  startupAvailable.value = await api.canStartAtLogin()
})
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
