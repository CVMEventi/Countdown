import {defineStore} from 'pinia'
import {ref} from 'vue'
import type {WebRtcClient, WebRtcConnectionState, WebRtcStatus} from '../../common/webrtcStatus.ts'

export const useWebRtcStore = defineStore('webRtc', () => {
  const enabled = ref(false)
  const state = ref<WebRtcConnectionState>('disabled')
  const controlCode = ref<string | null>(null)
  const viewCode = ref<string | null>(null)
  const lastError = ref<string | null>(null)
  const clients = ref<WebRtcClient[]>([])

  function apply(status: WebRtcStatus | null) {
    if (!status) return
    enabled.value = status.enabled
    state.value = status.state
    controlCode.value = status.controlCode
    viewCode.value = status.viewCode
    lastError.value = status.lastError
    clients.value = status.clients
  }

  return {enabled, state, controlCode, viewCode, lastError, clients, apply}
})
