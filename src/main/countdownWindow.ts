import BrowserWinHandler from './Utilities/BrowserWinHandler'
import BrowserWindowConstructorOptions = Electron.BrowserWindowConstructorOptions;

export default function createCountdownWindow (timerId: number, windowId: number, options: BrowserWindowConstructorOptions) {
  const winHandler = new BrowserWinHandler({...options, title: `Countdown ${timerId}-${windowId}`});

  winHandler.onCreated(() => {
    winHandler.loadPage(`/countdown`, {
        "timer": timerId.toString(),
        "window": windowId.toString()
      });
    // _browserWindow.toggleDevTools()
  })

  return winHandler
}
