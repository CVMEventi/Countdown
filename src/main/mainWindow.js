import BrowserWinHandler from './Utilities/BrowserWinHandler'
import { isDev } from './Utilities/dev'

export default function createMainWindow (options = {
  height: 580,
  width: 920,
  minWidth: 920,
  minHeight: 580,
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
