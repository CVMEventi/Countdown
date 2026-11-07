import {app, globalShortcut} from 'electron'
import type {GlobalShortcutStatus} from '../../common/shortcutStatus.ts'

export const SHOW_MAIN_WINDOW_SHORTCUT = 'CommandOrControl+Shift+M'

let registration: AbortController | null = null
let status: GlobalShortcutStatus = 'disabled'
const listeners = new Set<(status: GlobalShortcutStatus) => void>()

export const getGlobalShortcutStatus = (): GlobalShortcutStatus => status
export function onGlobalShortcutStatusChange(listener: (status: GlobalShortcutStatus) => void) {
  listeners.add(listener)
  return () => {listeners.delete(listener)}
}
function setStatus(value: GlobalShortcutStatus) {
  status = value
  listeners.forEach(listener => listener(value))
}

// Opt-in from General Settings: the shortcut is taken system-wide, so it must not
// silently steal keys from other applications. Resolve the current main window in
// the callback, so it also works when the application starts hidden in the tray.
export async function registerGlobalShortcuts(showMainWindow: () => void): Promise<boolean> {
  if (registration) return true
  const controller = new AbortController()
  registration = controller
  setStatus('registering')
  // Ignore a queued callback from a registration that has since been disabled.
  const activate = () => {
    if (registration === controller && !controller.signal.aborted) showMainWindow()
  }
  try {
    if (process.platform === 'linux' && (process.env.XDG_SESSION_TYPE === 'wayland' || process.env.WAYLAND_DISPLAY)) {
      // Electron 41 bypasses the portal under XWayland and disables it on
      // native GNOME Wayland. Use the desktop portal directly in either case.
      const {registerWaylandShortcut} = await import('./waylandShortcut.ts')
      const registered = await registerWaylandShortcut(activate, controller.signal, () => {
        if (registration !== controller) return
        registration = null
        setStatus('unavailable')
      })
      if (registration !== controller || controller.signal.aborted) return false
      if (!registered) registration = null
      setStatus(registered ? 'active' : 'unavailable')
      return registered
    }
    if (!globalShortcut.register(SHOW_MAIN_WINDOW_SHORTCUT, activate)) {
      console.warn('Show main window shortcut is unavailable; it may be in use by another application.')
      registration = null
      setStatus('unavailable')
      return false
    }
    controller.signal.addEventListener('abort', () => globalShortcut.unregister(SHOW_MAIN_WINDOW_SHORTCUT))
    app.once('will-quit', () => controller.abort())
    setStatus('active')
    return true
  } catch (error) {
    console.warn('Could not register Show main window shortcut:', error)
    if (registration === controller) {
      registration = null
      setStatus('unavailable')
    }
    return false
  }
}

export function unregisterGlobalShortcuts(): void {
  const previous = registration
  registration = null
  previous?.abort()
  setStatus('disabled')
}
