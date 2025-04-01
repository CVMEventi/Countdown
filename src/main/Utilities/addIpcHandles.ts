import {dialog, ipcMain, screen} from "electron";
import {CountdownApp} from "../App.ts";
import {IpcGetWindowSettingsArgs} from "../../common/IpcInterfaces.ts";
import {promises as fs} from "node:fs";

export default function addIpcHandles(app: CountdownApp)
{
  ipcMain.handle('screens:get', () => {
    return screen.getAllDisplays()
  })

  ipcMain.on('window-updated', async (event, timerId, windowId) => {
    app.timersOrchestrator.windowUpdated(timerId, windowId)
  })

  ipcMain.on('temporary-settings-updated', (event, arg) => {
    const browserWindow = app.countdownWindowHandler.browserWindow
    browserWindow.webContents.send('temporary-settings-updated', arg)
  })

  ipcMain.on('send-to-countdown-window', (event, arg) => {
    const browserWindow = app.countdownWindowHandler.browserWindow
    browserWindow.webContents.send('command', arg)
  })

  ipcMain.handle('countdown-bounds', (event, timerId: string, windowId: string) => {
    return app.timersOrchestrator.getWindowBounds(timerId, windowId)
  })

  ipcMain.on('current-timer:set', (event, timerId: string) => {
    app.timersOrchestrator.currentTimer = timerId;
  })

  ipcMain.handle('settings:get', (event, key: string) => {
    return app.config.get(key)
  })

  ipcMain.handle('settings:set', (event, key: string, value: string) => {
    const newSettings = app.config.set(key, JSON.parse(value))

    app.timersOrchestrator.configUpdated()

    if (newSettings.remote.ndiEnabled) {
      app.ndiServer.start();
      app.startNdiTimer();
    } else {
      app.ndiServer.stop()
      app.stopNdiTimer();
    }
    if (newSettings.remote.oscEnabled) {
      app.oscServer.port = newSettings.remote.oscPort;
      app.oscServer.start();
    } else {
      app.oscServer.stop();
    }
    app.ndiServer.alpha = newSettings.remote.ndiAlpha;

    return newSettings
  })

  ipcMain.handle('settings:get-window', (event, args: IpcGetWindowSettingsArgs) => {
    return app.config.settings.timers[args.timerId].windows[args.windowId]
  })

  ipcMain.handle('audio:select-file', async () => {
    const result = await dialog.showOpenDialog(null, {
      properties: ['openFile'],
      filters: [{
        name: 'Audio file',
        extensions: ['wav', 'mp3', 'flac'],
      }]
    })
    if (result.canceled) return null;
    return result.filePaths[0]
  })
}
