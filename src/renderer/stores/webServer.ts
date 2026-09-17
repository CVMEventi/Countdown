import {defineStore} from 'pinia'
import {ref} from 'vue'
import {NetworkAddress} from '../../common/network.ts'

export const useWebServerStore = defineStore('webServer', () => {
  const isRunning = ref(false)
  const port = ref<number|string|null>(null)
  const lastError = ref<string|null>(null)
  const addresses = ref<NetworkAddress[]>([])

  return { isRunning, port, lastError, addresses }
})
