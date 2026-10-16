import BrowserWinHandler from './Utilities/BrowserWinHandler.ts'
import BrowserWindowConstructorOptions = Electron.BrowserWindowConstructorOptions;
import {applicationMenu} from './Utilities/applicationMenu.ts';

export default function createCountdownWindow (timerId: string, timerName: string, windowId: string, options: () => BrowserWindowConstructorOptions, showMainWindow: () => void) {
  const winHandler = new BrowserWinHandler(() => ({...options(), title: `Countdown ${timerName} - ${windowId}`}));

  winHandler.onCreated(window => {
    window.on('show', () => window.webContents.send('window:visibility', true))
    window.on('hide', () => window.webContents.send('window:visibility', false))
    const menu = applicationMenu(showMainWindow)
    // Drag regions use the native system menu rather than webContents' event.
    window.on('system-context-menu', event => {
      event.preventDefault()
      menu.popup({window})
    })
    window.webContents.on('context-menu', event => {
      event.preventDefault()
      menu.popup({window})
    })
    winHandler.loadPage(`/countdown`, {
        "timer": timerId,
        "window": windowId
      });
    // _browserWindow.toggleDevTools()
  })

  return winHandler
}
