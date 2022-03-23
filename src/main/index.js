import { app, ipcMain, screen } from 'electron';
import Store from 'electron-store';
import createMainWindow from "./mainWindow";
import createCountdownWindow from './countdownWindow';
import WebServer from "./WebServer";
import { STORE_DEFAULTS } from "./constants";

let countdownWindowHandler = null;

// Init key value storage
const store = new Store(STORE_DEFAULTS)
Store.initRenderer()

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit()
})

countdownWindowHandler = createCountdownWindow({
  x: store.get('window.x') ?? 100,
  y: store.get('window.y') ?? 100,
  height: store.get('window.height') ?? 720,
  width: store.get('window.width') ?? 1280,
  // fullscreen: true
  frame: false,
  enableLargerThanScreen: true
})

countdownWindowHandler.onCreated(() => {
  countdownWindowHandler.browserWindow.on('resize', () => {
    console.log(countdownWindowHandler.browserWindow.getBounds())
  })
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
})

ipcMain.on('window-updated', (event, arg) => {
  const browserWindow = countdownWindowHandler.browserWindow
  browserWindow.setBounds({
    x: store.get('window.x') ?? 100,
    y: store.get('window.y') ?? 100,
    height: store.get('window.height') ?? 720,
    width: store.get('window.width') ?? 1280,
  })
})

ipcMain.handle('get-screens', (event, ...args) => {
  return screen.getAllDisplays()
})

function sleep (ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

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



const webServerEnabled = store.get('settings.webServerEnabled') === null ? false : store.get('settings.webServerEnabled')
const port = store.get('settings.webServerPort') === null ? 6565 : store.get('settings.webServerPort')
let webServer = null

const mainWindowHandler = createMainWindow()
mainWindowHandler.onCreated(() => {
  webServer = new WebServer(mainWindowHandler.browserWindow)
  webServer.port = port

  ipcMain.on('webserver-manager', (event, command, arg) => {
    switch (command) {
      case 'stop':
        webServer.stop()
        break
      case 'start':
        const port = store.get('settings.webServerPort') === null ? 6565 : store.get('settings.webServerPort')
        webServer.port = port
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
