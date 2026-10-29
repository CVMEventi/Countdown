<template>
  <StoresUpdater @mounted="showWhenReady" />
  <Drawer v-model:open="globalStore.sidebarOpen">
    <SidebarMenu />
  </Drawer>
  <div class="h-full">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import {nextTick} from 'vue'
import StoresUpdater from './StoresUpdater.vue'
import Drawer from './Drawer.vue'
import SidebarMenu from './SidebarMenu.vue'
import {useGlobalStore} from '../stores/global.ts'

const globalStore = useGlobalStore()

async function showWhenReady() {
  await nextTick()
  await document.fonts.ready
  window.api.windowReady()
}
</script>
