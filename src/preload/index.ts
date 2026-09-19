import { contextBridge, ipcRenderer, clipboard } from 'electron'

contextBridge.exposeInMainWorld(
  'api',
  {
    getSettings: async (key: string|null) => await ipcRenderer.invoke('settings:get', key),
    getWindowSettings: async (args: any): Promise<any> => ipcRenderer.invoke('settings:get-window', args),
    setSettings: async (key: string, value: any) => await ipcRenderer.invoke('settings:set', key, value),
    command: async (command: any) => await ipcRenderer.invoke('command', command),
    onUpdate: (callback: (event: any, timerId: string, update: any) => void) => ipcRenderer.on('update', callback),
    onMessage: (callback: (event: any, message: any) => void) => ipcRenderer.on('message', callback),
    onSettingsUpdated: (callback: (event: any, settings: any) => void) => ipcRenderer.on('settings:updated', callback),
    onWebserverUpdate: (callback: (event: any, update: any) => void) => ipcRenderer.on('webserver-update', callback),
    windowUpdated: (timerId: string, windowId: string) => ipcRenderer.send('window-updated', timerId, windowId),
    currentTimerSet: (currentTimerId: string): void => ipcRenderer.send('current-timer:set', currentTimerId),
    settingsUpdated: () => ipcRenderer.send('settings-updated'),
    onAudioPlay: (callback: (event: any, timerId: string, audioFile: string, mimeType: string, deviceId: string | null) => void) => ipcRenderer.on('audio:play', callback),
    onAudioStop: (callback: (event: any, timerId: string) => void) => ipcRenderer.on('audio:stop', callback),
    onAudioState: (callback: (event: any, playingTimerIds: string[]) => void) => ipcRenderer.on('audio:state', callback),
    audioEnded: (timerId: string) => ipcRenderer.send('audio:ended', timerId),
    isServerRunning: async () => await ipcRenderer.invoke('server-running'),
    manageServer: async (command: string, port?: number) => await ipcRenderer.invoke('webserver-manager', command, port),
    getScreens: async (): Promise<Electron.Screen[]> => await ipcRenderer.invoke('screens:get'),
    getNetworkAddresses: async () => await ipcRenderer.invoke('network:addresses'),
    onScreensUpdated: (callback: (event: any) => void) => ipcRenderer.on('screens-updated', callback),
    selectAudioFile: async (): Promise<string> => await ipcRenderer.invoke('audio:select-file'),
    onWindowBoundsUpdated: (callback: (event: any, timerId: string, windowId: string, bounds: any) => void) => ipcRenderer.on('window-bounds:updated', callback),
    webrtcStatus: async () => await ipcRenderer.invoke('webrtc:status'),
    webrtcRotateCode: async () => await ipcRenderer.invoke('webrtc:rotate-code'),
    webrtcRevoke: async (clientId: string) => await ipcRenderer.invoke('webrtc:revoke', clientId),
    onWebrtcUpdate: (callback: (event: any, status: any) => void) => ipcRenderer.on('webrtc-update', callback),
    playbackStatus: async () => await ipcRenderer.invoke('playback:status'),
    onPlaybackUpdate: (callback: (event: any, statuses: any) => void) => ipcRenderer.on('playback-update', callback),
  }
)

// Kept apart from `api` because every window gets this preload: the host channels are gated on
// the sender in main, and nothing else needs them
contextBridge.exposeInMainWorld(
  'webrtcHost',
  {
    onSession: (callback: (event: any, session: any) => void) => ipcRenderer.on('webrtc-host:session', callback),
    onBroadcast: (callback: (event: any, update: any) => void) => ipcRenderer.on('webrtc-host:broadcast', callback),
    onRevoke: (callback: (event: any, clientId: string) => void) => ipcRenderer.on('webrtc-host:revoke', callback),
    reportStatus: (state: string, lastError: string | null) => ipcRenderer.send('webrtc-host:status', state, lastError),
    reportClients: (clients: unknown[]) => ipcRenderer.send('webrtc-host:clients', clients),
    sendCommand: async (command: unknown) => await ipcRenderer.invoke('webrtc-host:command', command),
    getSnapshot: async () => await ipcRenderer.invoke('webrtc-host:snapshot'),
    getSession: async () => await ipcRenderer.invoke('webrtc-host:session-get'),
    requestApproval: async (clientId: string, name: string) => await ipcRenderer.invoke('webrtc-host:request-approval', clientId, name),
    getAudio: async (timerId: string, haveRevision: string | null) => await ipcRenderer.invoke('webrtc-host:audio', timerId, haveRevision),
  }
)
contextBridge.exposeInMainWorld("clipboard", clipboard)
