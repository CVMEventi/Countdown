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

interface WebServerStatus {
  port: number|string|null
  isRunning: boolean
  lastError: string|null
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
  onAudioPlay(callback: (event: any, timerId: string, audioFile: string, mimeType: string, deviceId: string | null) => void): any
  onAudioStop(callback: (event: any, timerId: string) => void): any
  onAudioState(callback: (event: any, playingTimerIds: string[]) => void): any
  audioEnded(timerId: string): void
  getWindowSettings(args: IpcGetWindowSettingsArgs): Promise<any>
  isServerRunning(): Promise<WebServerStatus>
  manageServer(command: string, port?: number): Promise<any>
  getScreens(): Promise<Electron.Display[]>
  getNetworkAddresses(): Promise<{ interface: string; address: string }[]>
  onScreensUpdated(callback: (event: any) => void): any
  selectAudioFile(): Promise<string>
  onWindowBoundsUpdated(callback: (event: any, timerId: string, windowId: string, bounds: import('../src/common/config.ts').WindowBounds) => void): any
  webrtcStatus(): Promise<import('../src/common/webrtcStatus.ts').WebRtcStatus | null>
  webrtcRotateCode(): Promise<import('../src/common/webrtcStatus.ts').WebRtcStatus | null>
  webrtcRevoke(clientId: string): Promise<void>
  onWebrtcUpdate(callback: (event: any, status: import('../src/common/webrtcStatus.ts').WebRtcStatus) => void): any
}

interface WebRtcHostAPI {
  onSession(callback: (event: any, session: import('../src/common/webrtcStatus.ts').WebRtcSession) => void): any
  onBroadcast(callback: (event: any, update: any) => void): any
  onRevoke(callback: (event: any, clientId: string) => void): any
  reportStatus(state: string, lastError: string | null): void
  reportClients(clients: unknown[]): void
  sendCommand(command: unknown): Promise<{ok: boolean, error?: string}>
  getSnapshot(): Promise<any>
  getSession(): Promise<import('../src/common/webrtcStatus.ts').WebRtcSession | null>
  requestApproval(clientId: string, name: string): Promise<boolean>
}

export declare global {
  interface Window {
    api: API,
    webrtcHost: WebRtcHostAPI,
    clipboard: typeof import('electron').clipboard;
  }
}
