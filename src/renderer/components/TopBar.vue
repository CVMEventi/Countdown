<template>
  <div class="flex flex-row justify-between p-1 gap-2 items-center">
    <button type="button" class="-m-2.5 p-2.5 text-gray-400" @click="globalStore.sidebarOpen = true">
      <span class="sr-only">Open sidebar</span>
      <Bars3Icon class="size-6" aria-hidden="true" />
    </button>
    <slot></slot>
    <div class="flex-1"></div>
    <slot name="right"></slot>
    <div class="rounded-lg border-2 bg-white self-end p-0">
      <button class="block" type="button" @click="openURL('https://cvm.it')">
        <img class="h-10" alt="CVM Logo" src="../assets/images/logo.png" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {Bars3Icon} from '@heroicons/vue/24/outline'
import {shell} from 'electron'
import {useGlobalStore} from '../stores/global.ts'

const globalStore = useGlobalStore()

function openURL(url: string) {
  shell.openExternal(url);
}
</script>

<style scoped>

</style>
