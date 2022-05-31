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
      last
      :selected="selectedTab === 'remote'"
      @click="$router.replace('/control/remote')"
    >
      Remote
    </tab-button>
  </nav>
</template>

<script>
import TabButton from "./TabButton";

export default {
  name: "Navigation",
  components: {
    TabButton,
  },
  props: {
    selectedTab: String,
  }
}
</script>

<style scoped>

</style>
