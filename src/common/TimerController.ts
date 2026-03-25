export interface ITimerController {
  set(timerId: string, seconds: number): Promise<void>
  start(timerId: string): Promise<void>
  reset(timerId: string): Promise<void>
  toggle(timerId: string): Promise<void>
  jogSet(timerId: string, seconds: number): Promise<void>
  jogCurrent(timerId: string, seconds: number): Promise<void>
  sendMessage(timerId: string, message: string): Promise<void>
}
