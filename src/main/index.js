import {app, BrowserWindow, ipcMain} from "electron";
import addDefaultEvents from "./Utilities/addDefaultEvents";
import { isDev, enableDevMode } from "./Utilities/dev";
import Store from "electron-store";
import { STORE_DEFAULTS } from './Utilities/constants'
import { sleep } from "./Utilities/utilities";
import addIpcHandles from "./Utilities/addIpcHandles"
import createCountdownWindow from "./countdownWindow";
import createMainWindow from "./mainWindow";
import WebServer from "./WebServer";

let store = new Store(STORE_DEFAULTS);
let countdownWindowHandler = null
let mainWindowHandler = null

addDefaultEvents();
addIpcHandles();
if (isDev) {
  enableDevMode();
}

mainWindowHandler = createMainWindow();

countdownWindowHandler = createCountdownWindow({
  x: store.get('window.x') ?? 100,
  y: store.get('window.y') ?? 100,
  height: store.get('window.height') ?? 720,
  width: store.get('window.width') ?? 1280,
  // fullscreen: true
  frame: false,
  enableLargerThanScreen: true
});

ipcMain.on('send-to-countdown-window', (event, arg) => {
  /**
   * @type {import('electron').BrowserWindow}
   */
  const browserWindow = countdownWindowHandler.browserWindow
  browserWindow.webContents.send('command', arg)
})

ipcMain.on('settings-updated', (event, arg) => {
  const browserWindow = countdownWindowHandler.browserWindow
  browserWindow.webContents.send('settings-updated')
})

ipcMain.on('window-updated', (event, arg) => {
  const browserWindow = countdownWindowHandler.browserWindow
  browserWindow.setBounds({
    x: store.get('window.x') ?? 100,
    y: store.get('window.y') ?? 100,
    height: store.get('window.height') ?? 720,
    width: store.get('window.width') ?? 1280
  })
})

ipcMain.on('manage-countdown-window', async (event, command, arg) => {
  switch (command) {
    case 'fullscreen-on':
      countdownWindowHandler.browserWindow.setFullScreen(false)
      if (arg !== null) {
        await sleep(1000)
        countdownWindowHandler.browserWindow.setPosition(arg.bounds.x + 100, arg.bounds.y + 100)
        countdownWindowHandler.browserWindow.setFullScreen(true)
      }
      break

    default:
      break
  }
})


const webServerEnabled = store.get('settings.webServerEnabled') === null
  ? false
  : store.get('settings.webServerEnabled')
const port = store.get('settings.webServerPort') === null ? 6565 : store.get('settings.webServerPort')
let webServer = null

mainWindowHandler.onCreated(() => {
  webServer = new WebServer(mainWindowHandler.browserWindow)
  webServer.port = port

  ipcMain.on('webserver-manager', (event, command, arg) => {
    switch (command) {
      case 'stop':
        webServer.stop()
        break
      case 'start':
        webServer.port = store.get('settings.webServerPort') === null
          ? 6565
          : store.get('settings.webServerPort')
        webServer.start()
        break
    }
  })

  if (webServerEnabled) {
    webServer.start()
  }
})

ipcMain.handle('server-running', (event, ...args) => {
  return webServer.isRunning
})
