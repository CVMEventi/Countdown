<template>
  <div class="h-full flex grow flex-col gap-y-5 overflow-y-auto bg-zinc-900 px-6 ring-1 ring-white/10">
    <nav class="flex flex-1 flex-col pt-5">
      <ul role="list" class="flex flex-1 flex-col gap-y-4">
        <li>
          <ul role="list" class="-mx-2 space-y-1">
            <li v-for="item in navigation" :key="item.name">
              <RouterLink
                :to="item.to"
                @click="globalStore.sidebarOpen = false"
                class="group flex gap-x-3 rounded-md p-1 text-sm/6 font-semibold text-gray-400 hover:bg-zinc-800 hover:text-white"
                exactActiveClass="bg-zinc-800 text-white">
                <component :is="item.icon" class="size-6 shrink-0" aria-hidden="true" />
                {{ item.name }}
              </RouterLink>
            </li>
          </ul>
        </li>
        <li>
          <div class="text-xs/6 font-semibold text-gray-400">Settings</div>
          <ul role="list" class="-mx-2 mt-2 space-y-1">
            <li v-for="settingsPane in settingsPanes" :key="settingsPane.name">
              <RouterLink
                :to="settingsPane.to"
                @click="globalStore.sidebarOpen = false"
                class="group flex gap-x-3 rounded-md p-1 text-sm/6 font-semibold text-gray-400 hover:bg-zinc-800 hover:text-white"
                exactActiveClass="bg-zinc-800 text-white"
              >
                <component :is="settingsPane.icon" class="size-6 shrink-0" aria-hidden="true" />
                <span class="truncate">{{ settingsPane.name }}</span>
              </RouterLink>
            </li>
          </ul>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script setup lang="ts">
import {
  HomeIcon,
  CogIcon,
  ClockIcon,
  ServerIcon,
} from '@heroicons/vue/24/outline'
import {useGlobalStore} from '../stores/global.ts'

const globalStore = useGlobalStore()

const navigation = [
  { name: 'Control', to: '/control', icon: HomeIcon },
]
const settingsPanes = [
  { name: 'General', to: '/settings/general', icon: CogIcon },
  { name: 'Timers', to: '/settings/timers', icon: ClockIcon },
  { name: 'Remote', to: '/settings/remote', icon: ServerIcon },
]
</script>

<style scoped>

</style>
