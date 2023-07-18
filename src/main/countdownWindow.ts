import BrowserWinHandler from './Utilities/BrowserWinHandler'
import BrowserWindowConstructorOptions = Electron.BrowserWindowConstructorOptions;

export default function createCountdownWindow (options: BrowserWindowConstructorOptions) {
  const winHandler = new BrowserWinHandler({...options, title: 'Countdown'})

  winHandler.onCreated(() => {
    winHandler.loadPage('/countdown')
    // _browserWindow.toggleDevTools()
  })

  return winHandler
}
