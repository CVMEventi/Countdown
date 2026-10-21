import {app, globalShortcut} from 'electron'

export const SHOW_MAIN_WINDOW_SHORTCUT = 'CommandOrControl+Shift+M'

// Called once after app ready. Resolve the current main window in the callback,
// so it also works when the application starts hidden in the tray.
export async function registerGlobalShortcuts(showMainWindow: () => void): Promise<boolean> {
  try {
    if (process.platform === 'linux' && (process.env.XDG_SESSION_TYPE === 'wayland' || process.env.WAYLAND_DISPLAY)) {
      // Electron 41 bypasses the portal under XWayland and disables it on
      // native GNOME Wayland. Use the desktop portal directly in either case.
      const {registerWaylandShortcut} = await import('./waylandShortcut.ts')
      return await registerWaylandShortcut(showMainWindow)
    }
    if (!globalShortcut.register(SHOW_MAIN_WINDOW_SHORTCUT, showMainWindow)) {
      console.warn('Show main window shortcut is unavailable; it may be in use by another application.')
      return false
    }
    app.once('will-quit', () => globalShortcut.unregister(SHOW_MAIN_WINDOW_SHORTCUT))
    return true
  } catch (error) {
    console.warn('Could not register Show main window shortcut:', error)
    return false
  }
}
