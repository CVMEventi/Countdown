import type {BrowserWindow} from 'electron'

export function showMainWindow(window: BrowserWindow | null | undefined): void {
  if (!window || window.isDestroyed()) return
  if (window.isMinimized()) window.restore()
  else if (process.platform === 'linux'
    && (process.env.XDG_SESSION_TYPE === 'wayland' || process.env.WAYLAND_DISPLAY)
    && window.isVisible() && !window.isFocused()) {
    // Wayland can reject focus() for an already mapped window behind a fullscreen
    // timer. Re-map it so the compositor activates it like a restored hidden window.
    window.hide()
  }
  window.show()
  window.focus()
}
