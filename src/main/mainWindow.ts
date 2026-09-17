import BrowserWinHandler from './Utilities/BrowserWinHandler.ts'
import { isDev } from './Utilities/dev.ts'
import BrowserWindowConstructorOptions = Electron.BrowserWindowConstructorOptions;
import {APP_VERSION} from "../version.ts";

export default function createMainWindow (options: BrowserWindowConstructorOptions = {}) {
  options = {
    ...{
      height: 600,
      width: 1050,
      minWidth: 1050,
      minHeight: 600,
      title: `Countdown v${APP_VERSION}`
    },
    ...options,
  }
  const winHandler = new BrowserWinHandler(options)

  winHandler.onCreated(async () => {
    await winHandler.loadPage('/control')
    // Or load custom url
    // _browserWindow.loadURL('https://google.com')
    if (isDev) {
      winHandler.browserWindow.webContents.openDevTools();
    }
  })

  return winHandler
}
