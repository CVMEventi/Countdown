<template>
  <StoresUpdater />
  <Drawer v-model:open="globalStore.sidebarOpen">
    <SidebarMenu />
  </Drawer>
  <div class="h-full">
    <router-view></router-view>
  </div>
</template>

<script setup lang="ts">
import StoresUpdater from "./components/StoresUpdater.vue";
import Drawer from './components/Drawer.vue'
import SidebarMenu from './components/SidebarMenu.vue'
import {useGlobalStore} from './stores/global.ts'
import {onBeforeMount, ref} from 'vue'
import {ipcRenderer} from 'electron'
import {useSettingsStore} from './stores/settings.ts'

const globalStore = useGlobalStore()
const settingsStore = useSettingsStore()

onBeforeMount(async () => {
  settingsStore.settings = await ipcRenderer.invoke('settings:get')
})

</script>

<style scoped>

</style>
