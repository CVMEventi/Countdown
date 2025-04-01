import {defineStore} from 'pinia'
import {ref} from 'vue'

export const useGlobalStore = defineStore('global', () => {
  const sidebarOpen = ref(false)
  const currentTimer = ref<string|null>(null)

  return { sidebarOpen, currentTimer }
})
