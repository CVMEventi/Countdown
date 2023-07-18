<template>
  <nav class="relative z-0 rounded-lg shadow flex divide-x divide-gray-200" aria-label="Tabs">
    <tab-button
      first
      :selected="selectedTab === 'main'"
      @click="$router.replace('/control/main')"
    >
      Countdown
    </tab-button>
    <tab-button
      :selected="selectedTab === 'settings'"
      @click="$router.replace('/control/settings')"
    >
      Settings
    </tab-button>
    <tab-button
      :selected="selectedTab === 'remote'"
      @click="$router.replace('/control/remote')"
    >
      Remote
    </tab-button>
    <tab-button
      last
      :selected="selectedTab === 'windows'"
      @click="$router.replace('/control/windows')"
    >
      Windows
    </tab-button>
  </nav>
</template>

<script lang="ts" setup>
import TabButton from "./TabButton.vue";

defineOptions({
  name: 'Navigation',
});

export interface Props {
  selectedTab: string
}

defineProps<Props>();
</script>

<style scoped>

</style>
