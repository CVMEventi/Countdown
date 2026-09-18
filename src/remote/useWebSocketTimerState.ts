import { ref, reactive, onMounted, onUnmounted } from 'vue'
import type {
  AnyWebSocketUpdate,
  AudioStateWebSocketUpdate,
  AudioWebSocketUpdate,
  ConfigWebSocketUpdate,
  MessageWebSocketUpdate,
  TimerEngineUpdates,
  TimerEngineWebSocketUpdate,
  TimerSnapshot,
} from '../common/TimerInterfaces.ts'
import type { Timers } from '../common/config.ts'
import { mapUpdate } from '../common/mapUpdate.ts'

export interface Messages {
  [key: string]: string | null
}

export function useWebSocketTimerState() {
  const timers = ref<Timers>({})
  const updates = reactive<TimerEngineUpdates>({})
  const messages = reactive<Messages>({})
  const currentTimerId = ref<string | null>(null)
  const connected = ref(false)
  const playingSounds = ref<string[]>([])

  const audioListeners: ((timerId: string) => void)[] = []

  const audioStopListeners: ((timerId: string) => void)[] = []

  function onAudio(listener: (timerId: string) => void) {
    audioListeners.push(listener)
  }

  function onAudioStop(listener: (timerId: string) => void) {
    audioStopListeners.push(listener)
  }

  let ws: WebSocket | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null

  // The selected timer can disappear while we are connected (deleted in the app), which
  // would otherwise leave the UI pointing at a timer that no longer exists
  function selectTimer(newTimers: Timers) {
    const ids = Object.keys(newTimers)
    if (currentTimerId.value && ids.includes(currentTimerId.value)) return
    currentTimerId.value = ids[0] ?? null
  }

  // A desktop new enough to send a snapshot makes the /timers fetch redundant, and lets us
  // ignore a fetch that resolves after the socket has already delivered fresher state
  let snapshotReceived = false

  function connect() {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
    ws = new WebSocket(`${protocol}://${location.host}/ws`)

    ws.onopen = () => { connected.value = true }
    ws.onclose = () => {
      connected.value = false
      retryTimer = setTimeout(connect, 3000)
    }
    ws.onmessage = (event) => {
      try {
        const data: AnyWebSocketUpdate = JSON.parse(event.data)
        if (data.type === 'snapshot') {
          const update = data.update as TimerSnapshot
          snapshotReceived = true
          timers.value = update.timers
          Object.entries(update.timerEngine).forEach(([timerId, engineUpdate]) => {
            updates[timerId] = mapUpdate(engineUpdate)
          })
          Object.entries(update.messages).forEach(([timerId, message]) => {
            messages[timerId] = message
          })
          playingSounds.value = update.playingTimerIds
          selectTimer(timers.value)
        } else if (data.type === 'timerEngine') {
          const update = data.update as TimerEngineWebSocketUpdate
          if (update.timerId) {
            updates[update.timerId] = mapUpdate(update)
          }
        } else if (data.type === 'config') {
          timers.value = data.update as ConfigWebSocketUpdate
          selectTimer(timers.value)
        } else if (data.type === 'message') {
          const update = data.update as MessageWebSocketUpdate
          if (update.timerId) {
            messages[update.timerId] = update.message || null
          }
        } else if (data.type === 'audio') {
          const update = data.update as AudioWebSocketUpdate
          audioListeners.forEach(listener => listener(update.timerId))
        } else if (data.type === 'audioStop') {
          const update = data.update as AudioWebSocketUpdate
          audioStopListeners.forEach(listener => listener(update.timerId))
        } else if (data.type === 'audioState') {
          playingSounds.value = (data.update as AudioStateWebSocketUpdate).playingTimerIds
        }
      } catch {}
    }
  }

  function disconnect() {
    if (retryTimer) clearTimeout(retryTimer)
    ws?.close()
  }

  onMounted(async () => {
    // Connect first so the snapshot is on its way while the fallback fetch is in flight
    connect()

    // Fallback for a desktop that predates the snapshot frame
    try {
      const res = await fetch('/timers')
      const fetched = await res.json()
      if (snapshotReceived) return
      timers.value = fetched
      selectTimer(timers.value)
    } catch {
      // The socket is the real source of state; a failed fallback fetch is not worth surfacing
    }
  })

  onUnmounted(disconnect)

  return { timers, updates, messages, currentTimerId, connected, playingSounds, onAudio, onAudioStop }
}
