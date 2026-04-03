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
    onAudioPlay: (callback: (event: any, audioFile: string, mimeType: string) => void) => ipcRenderer.on('audio:play', callback),
    isServerRunning: async () => await ipcRenderer.invoke('server-running'),
    manageServer: async (command: string, port?: number) => await ipcRenderer.invoke('webserver-manager', command, port),
    getScreens: async (): Promise<Electron.Screen[]> => await ipcRenderer.invoke('screens:get'),
    onScreensUpdated: (callback: (event: any) => void) => ipcRenderer.on('screens-updated', callback),
    selectAudioFile: async (): Promise<string> => await ipcRenderer.invoke('audio:select-file'),
    getWindowBounds: async (timerId: string, windowId: string): Promise<any> => await ipcRenderer.invoke('countdown-bounds', timerId, windowId),
  }
)
contextBridge.exposeInMainWorld("clipboard", clipboard)
