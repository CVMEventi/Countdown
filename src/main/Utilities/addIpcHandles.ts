import {dialog, ipcMain, screen} from "electron";
import {CountdownApp} from "../App.ts";
import {IpcGetWindowSettingsArgs} from "../../common/IpcInterfaces.ts";
import {DEFAULT_WEBSERVER_ENABLED, DEFAULT_WEBSERVER_PORT, RemoteSettings} from "../../common/config.ts";
import {promises as fs} from "node:fs";
import {listLocalIPv4Addresses} from "./network.ts";

// The web server toggle has to behave like the NDI/OMT/OSC ones: enabling it starts the
// server right away and disabling it stops it, without a second manual action. Only the
// transition acts, so an unrelated settings save never retries a start that failed:
// restarting after a failure is what the button in the remote settings is for.
async function applyWebServerState(app: CountdownApp, remote: RemoteSettings, wasEnabled: boolean) {
  if (!app.webServer) return

  const enabled = remote.webServerEnabled ?? DEFAULT_WEBSERVER_ENABLED

  if (!enabled) {
    if (app.webServer.isRunning) await app.webServer.stop()
    return
  }

  if (wasEnabled || app.webServer.isRunning) return

  app.webServer.port = Number(remote.webServerPort) || DEFAULT_WEBSERVER_PORT
  await app.webServer.start()
}

export default function addIpcHandles(app: CountdownApp)
{
  ipcMain.handle('screens:get', () => {
    return screen.getAllDisplays()
  })

  ipcMain.handle('network:addresses', () => {
    return listLocalIPv4Addresses()
  })

  ipcMain.on('window-updated', async (event, timerId, windowId) => {
    app.timersOrchestrator.windowUpdated(timerId, windowId)
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

  ipcMain.handle('settings:set', async (event, key: string, value) => {
    const wasWebServerEnabled = app.config.settings.remote?.webServerEnabled ?? DEFAULT_WEBSERVER_ENABLED
    const newSettings = app.config.set(key, value)

    app.timersOrchestrator.configUpdated()

    if (key === 'remote' || key === null) {
      await applyWebServerState(app, newSettings.remote, wasWebServerEnabled)
      if (newSettings.remote.ndiEnabled) {
        app.timersOrchestrator.startNdi();
        app.startNdiTimer();
      } else {
        app.timersOrchestrator.stopNdi();
        app.stopNdiTimer();
      }
      if (newSettings.remote.omtEnabled) {
        app.timersOrchestrator.startOmt();
        app.startOmtTimer();
      } else {
        app.timersOrchestrator.stopOmt();
        app.stopOmtTimer();
      }
      if (newSettings.remote.oscEnabled) {
        app.oscServer.port = newSettings.remote.oscPort;
        app.oscServer.start();
      } else {
        app.oscServer.stop();
      }
      app.timersOrchestrator.setNdiAlpha(newSettings.remote.ndiAlpha);
    }

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
