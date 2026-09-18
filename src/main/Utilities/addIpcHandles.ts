import {dialog, ipcMain, screen} from "electron";
import {CountdownApp} from "../App.ts";
import {IpcGetWindowSettingsArgs} from "../../common/IpcInterfaces.ts";
import {DEFAULT_WEBSERVER_ENABLED, DEFAULT_WEBSERVER_PORT, RemoteSettings} from "../../common/config.ts";
import {validateCommand} from "../../common/protocol.ts";
import type {WebRtcClient, WebRtcConnectionState} from "../Remotes/WebRtcRemote.ts";
import {promises as fs} from "node:fs";
import mime from "mime/lite";
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

  ipcMain.on('audio:ended', (event, timerId: string) => {
    app.timersOrchestrator.setSoundPlaying(timerId, false)
  })

  ipcMain.on('window-updated', async (event, timerId, windowId) => {
    app.timersOrchestrator.windowUpdated(timerId, windowId)
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
      await app.webRtcRemote?.applyState(newSettings.remote);
    }

    return newSettings
  })

  ipcMain.handle('settings:get-window', (event, args: IpcGetWindowSettingsArgs) => {
    return app.config.settings.timers[args.timerId].windows[args.windowId]
  })

  ipcMain.handle('webrtc:status', () => app.webRtcRemote?.status() ?? null)

  ipcMain.handle('webrtc:rotate-code', () => {
    app.webRtcRemote?.rotateCode()
    return app.webRtcRemote?.status() ?? null
  })

  ipcMain.handle('webrtc:revoke', (event, clientId: string) => {
    app.webRtcRemote?.revoke(clientId)
  })

  // Every window shares the preload, so the host channels only answer the host window
  function fromHost(event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent) {
    const hostId = app.webRtcRemote?.hostWebContentsId
    return hostId !== null && hostId !== undefined && event.sender.id === hostId
  }

  ipcMain.on('webrtc-host:status', (event, state: WebRtcConnectionState, lastError: string | null) => {
    if (!fromHost(event)) return
    app.webRtcRemote?.hostReportedStatus(state, lastError)
  })

  ipcMain.on('webrtc-host:clients', (event, clients: WebRtcClient[]) => {
    if (!fromHost(event)) return
    app.webRtcRemote?.hostReportedClients(clients)
  })

  ipcMain.handle('webrtc-host:session-get', (event) => {
    if (!fromHost(event)) return null
    return app.webRtcRemote?.session ?? null
  })

  ipcMain.handle('webrtc-host:request-approval', async (event, clientId: string, name: string) => {
    if (!fromHost(event)) return false
    return await app.webRtcRemote?.requestApproval(clientId, name) ?? false
  })

  // The remote gets the bytes over the data channel, so it never needs the path
  ipcMain.handle('webrtc-host:audio', async (event, timerId: string, haveRevision: string | null) => {
    if (!fromHost(event)) return null

    const audioFile = app.timersOrchestrator.timers[timerId]?.settings.audioFile
    if (!audioFile) return {reason: 'none'}

    try {
      const stat = await fs.stat(audioFile)
      const revision = `${stat.mtimeMs}-${stat.size}`
      if (haveRevision && haveRevision === revision) return {reason: 'unchanged'}

      const data = await fs.readFile(audioFile, {encoding: 'base64'})
      return {
        revision,
        mimeType: mime.getType(audioFile) ?? 'application/octet-stream',
        size: stat.size,
        data,
      }
    } catch {
      return {reason: 'unreadable'}
    }
  })

  ipcMain.handle('webrtc-host:snapshot', (event) => {
    if (!fromHost(event)) return null
    return app.timersOrchestrator.buildSnapshot()
  })

  ipcMain.handle('webrtc-host:command', (event, command: unknown) => {
    if (!fromHost(event)) return {ok: false, error: 'not-host'}

    const timers = app.timersOrchestrator.timers
    const result = validateCommand(command, (timerId: string) => timerId in timers)
    if (!result.ok || !result.command) return {ok: false, error: result.message}

    const engine = timers[result.command.timerId].engine
    switch (result.command.verb) {
      case 'set': engine.set(result.command.seconds); break
      case 'start': engine.start(); break
      case 'reset': engine.reset(); break
      case 'toggle': engine.toggleTimer(); break
      case 'jogSet': engine.jogSet(result.command.seconds); break
      case 'jogCurrent': engine.jogCurrent(result.command.seconds); break
      case 'sendMessage': engine.setMessage(result.command.message); break
      case 'stopSound': app.timersOrchestrator.stopSound(result.command.timerId); break
    }

    return {ok: true}
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
