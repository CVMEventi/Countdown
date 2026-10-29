import {app, globalShortcut} from 'electron'

export const SHOW_MAIN_WINDOW_SHORTCUT = 'CommandOrControl+Shift+M'

let registration: AbortController | null = null

// Opt-in from General Settings: the shortcut is taken system-wide, so it must not
// silently steal keys from other applications. Resolve the current main window in
// the callback, so it also works when the application starts hidden in the tray.
export async function registerGlobalShortcuts(showMainWindow: () => void): Promise<boolean> {
  if (registration) return true
  const controller = new AbortController()
  registration = controller
  try {
    if (process.platform === 'linux' && (process.env.XDG_SESSION_TYPE === 'wayland' || process.env.WAYLAND_DISPLAY)) {
      // Electron 41 bypasses the portal under XWayland and disables it on
      // native GNOME Wayland. Use the desktop portal directly in either case.
      const {registerWaylandShortcut} = await import('./waylandShortcut.ts')
      const registered = await registerWaylandShortcut(showMainWindow, controller.signal)
      if (!registered && registration === controller) registration = null
      return registered
    }
    if (!globalShortcut.register(SHOW_MAIN_WINDOW_SHORTCUT, showMainWindow)) {
      console.warn('Show main window shortcut is unavailable; it may be in use by another application.')
      registration = null
      return false
    }
    controller.signal.addEventListener('abort', () => globalShortcut.unregister(SHOW_MAIN_WINDOW_SHORTCUT))
    app.once('will-quit', () => controller.abort())
    return true
  } catch (error) {
    console.warn('Could not register Show main window shortcut:', error)
    if (registration === controller) registration = null
    return false
  }
}

export function unregisterGlobalShortcuts(): void {
  registration?.abort()
  registration = null
}
