import {defineStore} from 'pinia'
import {ref} from 'vue'
import type {PlaybackProviderStatus} from '../../common/playback.ts'

export const usePlaybackStore = defineStore('playback', () => {
  const statuses = ref<{[providerId: string]: PlaybackProviderStatus}>({})

  function apply(incoming: PlaybackProviderStatus[] | null) {
    const next: {[providerId: string]: PlaybackProviderStatus} = {}
    ;(incoming ?? []).forEach(status => { next[status.id] = status })
    statuses.value = next
  }

  return {statuses, apply}
})
