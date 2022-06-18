import "v8-compile-cache";
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

function screensUpdated(browserWindow) {
  browserWindow.webContents.send('screens-updated');
}

mainWindowHandler = createMainWindow();

mainWindowHandler.onCreated((browserWindow) => {
  setMenu(mainWindowHandler);

  console.log(screen.getAllDisplays())

  screen.on('display-added', () => screensUpdated(browserWindow))
  screen.on('display-removed', () => screensUpdated(browserWindow))
  screen.on('display-metrics-changed', () => screensUpdated(browserWindow))

  browserWindow.on('closed', () => {
    app.quit();
  })
})

countdownWindowHandler = createCountdownWindow({
  x: store.get('window.x') ?? 100,
  y: store.get('window.y') ?? 100,
  height: store.get('window.height') ?? 720,
  width: store.get('window.width') ?? 1280,
  // fullscreen: true
  frame: false,
  enableLargerThanScreen: true,
  transparent: true,
  alwaysOnTop: store.get('settings.timerAlwaysOnTop', false),
});

countdownWindowHandler.onCreated(async function (browserWindow) {
  browserWindow.on('closed', () => {
    app.quit();
  })

  await setCountdownWindowPosition(browserWindow)
})

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

  browserWindow.setAlwaysOnTop(store.get('settings.timerAlwaysOnTop', false))
})
ipcMain.on('temporary-settings-updated', (event, arg) => {
  const browserWindow = countdownWindowHandler.browserWindow
  browserWindow.webContents.send('temporary-settings-updated', arg)
})

/**
 * @param {null|Electron.CrossProcessExports.BrowserWindow|*} browserWindow
 */
async function setCountdownWindowPosition(browserWindow) {
  const fullscreenOn = store.get('window.fullscreenOn', null)
  const selectedScreen = screen.getAllDisplays().find((display) => display.id === fullscreenOn)

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
}

ipcMain.on('window-updated', async (event, arg) => {
  await setCountdownWindowPosition(countdownWindowHandler.browserWindow)
})

const webServerEnabled = store.get('settings.webServerEnabled') === null
  ? false
  : store.get('settings.webServerEnabled')
const port = store.get('settings.webServerPort') === null ? 6565 : store.get('settings.webServerPort')
let webServer = null

mainWindowHandler.onCreated((browserWindow) => {
  webServer = new WebServer(browserWindow)
  webServer.port = port

  if (webServerEnabled) {
    webServer.start()
  }
})

ipcMain.handle('countdown-bounds', (event, args) => {
  const browserWindow = countdownWindowHandler.browserWindow
  return browserWindow.getBounds()
})
