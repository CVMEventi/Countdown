import BrowserWinHandler from './Utilities/BrowserWinHandler'
import {BrowserWindow} from "electron";
import BrowserWindowConstructorOptions = Electron.BrowserWindowConstructorOptions;

export interface CountdownWindowConfiguration {

}

export default function createCountdownWindow (options: BrowserWindowConstructorOptions) {
  const winHandler = new BrowserWinHandler({...options, title: 'Countdown'})

  winHandler.onCreated((_browserWindow: BrowserWindow) => {
    winHandler.loadPage('/countdown')
    // _browserWindow.toggleDevTools()
  })

  return winHandler
}
