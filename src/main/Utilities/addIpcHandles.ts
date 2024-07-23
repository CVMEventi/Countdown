import {ipcMain, screen} from "electron";
import {CountdownApp} from "../App";
import {IpcGetWindowSettingsArgs} from "../../common/IpcInterfaces";

export default function addIpcHandles(app: CountdownApp)
{
  ipcMain.handle('get-screens', () => {
    return screen.getAllDisplays()
  })

  ipcMain.on('window-updated', async () => {
    app.timersOrchestrator.windowUpdated(0, 0)
  })

  ipcMain.on('temporary-settings-updated', (event, arg) => {
    const browserWindow = app.countdownWindowHandler.browserWindow
    browserWindow.webContents.send('temporary-settings-updated', arg)
  })

  ipcMain.on('send-to-countdown-window', (event, arg) => {
    const browserWindow = app.countdownWindowHandler.browserWindow
    browserWindow.webContents.send('command', arg)
  })

  ipcMain.handle('countdown-bounds', (event, timerId: number, windowId: number) => {
    return app.timersOrchestrator.getWindowBounds(timerId, windowId)
  })

  ipcMain.handle('settings:get', (event, key: string) => {
    return app.config.get(key)
  })

  ipcMain.handle('settings:set', (event, key: string, value: any) => {
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
}
