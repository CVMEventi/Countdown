import BrowserWinHandler from './Utilities/BrowserWinHandler.ts'
import BrowserWindowConstructorOptions = Electron.BrowserWindowConstructorOptions;

export default function createCountdownWindow (timerId: string, timerName: string, windowId: string, options: BrowserWindowConstructorOptions) {
  const winHandler = new BrowserWinHandler({...options, title: `Countdown ${timerName} - ${windowId}`});

  winHandler.onCreated(() => {
    winHandler.loadPage(`/countdown`, {
        "timer": timerId,
        "window": windowId
      });
    // _browserWindow.toggleDevTools()
  })

  return winHandler
}
