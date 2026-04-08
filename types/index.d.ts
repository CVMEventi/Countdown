declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.ico' {
  const value: string;
  export default value;
}

interface IpcGetWindowSettingsArgs {
  timerId: string
  windowId: string
}

interface MessageUpdate {
  timerId: string
  message: string|null
}

interface API {
  getSettings(key?: string): Promise<any>
  setSettings(key: string, value: any): Promise<any>
  command(command: any): Promise<any>
  onUpdate(callback: (event: any, timerId: string, update: any) => void): any
  onMessage(callback: (event: any, message: MessageUpdate) => void): any
  onSettingsUpdated(callback: (event: any, settings: any) => void): any
  onWebserverUpdate(callback: (event: any, update: any) => void): any
  windowUpdated(timerId: string, windowId: string): void
  currentTimerSet(currentTimerId: string): void
  settingsUpdated(): void
  onAudioPlay(callback: (event: any, audioFile: string, mimeType: string) => void): any
  getWindowSettings(args: IpcGetWindowSettingsArgs): Promise<any>
  isServerRunning(): Promise<boolean>
  manageServer(command: string, port?: number): Promise<any>
  getScreens(): Promise<Electron.Display[]>
  onScreensUpdated(callback: (event: any) => void): any
  selectAudioFile(): Promise<string>
  getWindowBounds(timerId: string, windowId: string): Promise<any>
}

export declare global {
  interface Window {
    api: API,
    clipboard: typeof import('electron').clipboard;
  }
}
