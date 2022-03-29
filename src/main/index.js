import {app, BrowserWindow, ipcMain, screen} from "electron";
import addDefaultEvents from "./Utilities/addDefaultEvents";
import { isDev, enableDevMode } from "./Utilities/dev";
import Store from "electron-store";
import { DEFAULT_STORE } from '../common/constants'
import { sleep } from "./Utilities/utilities";
import addIpcHandles from "./Utilities/addIpcHandles"
import createCountdownWindow from "./countdownWindow";
import createMainWindow from "./mainWindow";
import WebServer from "./WebServer";
import setMenu from "./Utilities/setMenu";

let store = new Store(DEFAULT_STORE);
let countdownWindowHandler = null
let mainWindowHandler = null

addDefaultEvents();
addIpcHandles();
if (isDev) {
  enableDevMode();
}

mainWindowHandler = createMainWindow();

mainWindowHandler.onCreated(() => {
  setMenu(mainWindowHandler);
})

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

ipcMain.on('window-updated', async (event, arg) => {
  const fullscreenOn = store.get('window.fullscreenOn', null)
  const selectedScreen = screen.getAllDisplays().find((display) => display.id === fullscreenOn)
  /**
   * @type {null|Electron.CrossProcessExports.BrowserWindow|*}
   */
  const browserWindow = countdownWindowHandler.browserWindow;

  if (browserWindow.fullScreen) {
    browserWindow.setFullScreen(false)
  }
  if (fullscreenOn !== null) {
    await sleep(1000)
    browserWindow.setPosition(selectedScreen.bounds.x + 100, selectedScreen.bounds.y + 100)
    browserWindow.setFullScreen(true)
    return;
  }

  browserWindow.setBounds({
    x: store.get('window.x') ?? 100,
    y: store.get('window.y') ?? 100,
    height: store.get('window.height') ?? 720,
    width: store.get('window.width') ?? 1280
  })
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
