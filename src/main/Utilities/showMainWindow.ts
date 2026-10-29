import type {BrowserWindow} from 'electron'

export function showMainWindow(window: BrowserWindow | null | undefined): void {
  if (!window || window.isDestroyed()) return
  if (window.isMinimized()) window.restore()
  window.show()
  window.focus()
}
