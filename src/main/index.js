import { app, ipcMain, screen } from 'electron'
import Store from 'electron-store'
import countdownWindowHandler from './countdownWindow'

const store = new Store({
  defaults: {
    settings: {
      backgroundColor: '#000000',
      textColor: '#ffffff',
      timerFinishedTextColor: '',
      clockColor: '#ffffff',
      clockTextColor: '#ffffff',
      presets: [
        5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60
      ]
    }
  }
})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit()
})

Store.initRenderer()

// Load here all startup windows
require('./mainWindow')

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
