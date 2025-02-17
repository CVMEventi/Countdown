import {defineStore} from 'pinia'
import {ref} from 'vue'

export const useGlobalStore = defineStore('global', () => {
  const sidebarOpen = ref(false)

  return { sidebarOpen }
})
