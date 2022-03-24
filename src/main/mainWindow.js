import BrowserWinHandler from './Utilities/BrowserWinHandler'
import { isDev } from './Utilities/dev'

export default function createMainWindow (options = {
  height: 800,
  width: 1400,
}) {
  const winHandler = new BrowserWinHandler(options)

  winHandler.onCreated(_browserWindow => {
    winHandler.loadPage('/')
    // Or load custom url
    // _browserWindow.loadURL('https://google.com')
    if (isDev) {
      winHandler.browserWindow.webContents.openDevTools();
    }
  })

  return winHandler
}
