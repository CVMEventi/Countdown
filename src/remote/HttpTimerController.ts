import type { ITimerController } from '../common/TimerController.ts'

export class HttpTimerController implements ITimerController {
  async set(timerId: string, seconds: number): Promise<void> {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    await fetch(`/timer/${timerId}/set/${h}/${m}/${s}`)
  }

  async start(timerId: string): Promise<void> {
    await fetch(`/timer/${timerId}/start`)
  }

  async reset(timerId: string): Promise<void> {
    await fetch(`/timer/${timerId}/reset`)
  }

  async toggle(timerId: string): Promise<void> {
    await fetch(`/timer/${timerId}/toggle-pause`)
  }

  async jogSet(timerId: string, seconds: number): Promise<void> {
    await fetch(`/timer/${timerId}/jog-set/0/0/${seconds}`)
  }

  async jogCurrent(timerId: string, seconds: number): Promise<void> {
    await fetch(`/timer/${timerId}/jog-current/0/0/${seconds}`)
  }

  async sendMessage(timerId: string, message: string): Promise<void> {
    if (message) {
      await fetch(`/timer/${timerId}/message/${encodeURIComponent(message)}`)
    } else {
      await fetch(`/timer/${timerId}/message`)
    }
  }
}
