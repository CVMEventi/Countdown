import BrowserWinHandler from './Utilities/BrowserWinHandler.ts'
import BrowserWindowConstructorOptions = Electron.BrowserWindowConstructorOptions;
import {applicationMenu} from './Utilities/applicationMenu.ts';

export default function createCountdownWindow (timerId: string, timerName: string, windowId: string, options: () => BrowserWindowConstructorOptions, showMainWindow: () => void, shortcutEnabled: () => boolean = () => false) {
  const winHandler = new BrowserWinHandler(() => ({...options(), title: `Countdown ${timerName} - ${windowId}`}));

  winHandler.onCreated(window => {
    // Content stays revealed once ready, even while the window is hidden: NDI/OMT capture it
    window.on('show', () => window.webContents.send('window:visibility', true))
    let enabled = shortcutEnabled()
    let menu = applicationMenu(showMainWindow, enabled)
    // Keep the popup alive and reuse it for native/web context events. Rebuild it
    // only when the setting changes, including for windows that already exist.
    const popupMenu = () => {
      const current = shortcutEnabled()
      if (current !== enabled) {
        menu = applicationMenu(showMainWindow, current)
        enabled = current
      }
      menu.popup({window})
    }
    // Drag regions use the native system menu rather than webContents' event.
    window.on('system-context-menu', event => {
      event.preventDefault()
      popupMenu()
    })
    window.webContents.on('context-menu', event => {
      event.preventDefault()
      popupMenu()
    })
    winHandler.loadPage(`/countdown`, {
        "timer": timerId,
        "window": windowId
      });
    // _browserWindow.toggleDevTools()
  })

  return winHandler
}
