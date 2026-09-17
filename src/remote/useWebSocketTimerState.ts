import { ref, reactive, onMounted, onUnmounted } from 'vue'
import type {
  AnyWebSocketUpdate,
  ConfigWebSocketUpdate,
  MessageWebSocketUpdate,
  TimerEngineUpdate,
  TimerEngineUpdates,
  TimerEngineWebSocketUpdate,
} from '../common/TimerInterfaces.ts'
import type { Timers } from '../common/config.ts'

export interface Messages {
  [key: string]: string | null
}

export function useWebSocketTimerState() {
  const timers = ref<Timers>({})
  const updates = reactive<TimerEngineUpdates>({})
  const messages = reactive<Messages>({})
  const currentTimerId = ref<string | null>(null)
  const connected = ref(false)

  let ws: WebSocket | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null

  function mapUpdate(u: TimerEngineWebSocketUpdate): TimerEngineUpdate {
    return {
      setSeconds: u.setTime,
      countSeconds: u.currentTime ?? 0,
      currentSeconds: u.currentTime ?? 0,
      extraSeconds: u.currentTime ?? 0 < 0 ? Math.abs(u.currentTime ?? 0) : 0,
      secondsSetOnCurrentTimer: u.timeSetOnCurrentTimer ?? u.setTime,
      isReset: u.state === 'Not Running',
      isRunning: u.state === 'Running' || u.state === 'Expiring' || u.state === 'Expired',
      isExpiring: u.state === 'Expiring',
      isCountingUp: u.state === 'Expired',
      timerEndsAt: u.timerEndsAt ?? null,
    }
  }

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
        if (data.type === 'timerEngine') {
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
        }
      } catch {}
    }
  }

  function disconnect() {
    if (retryTimer) clearTimeout(retryTimer)
    ws?.close()
  }

  onMounted(async () => {
    const res = await fetch('/timers')
    timers.value = await res.json()
    currentTimerId.value = Object.keys(timers.value)[0] ?? null
    connect()
  })

  onUnmounted(disconnect)

  return { timers, updates, messages, currentTimerId, connected }
}
