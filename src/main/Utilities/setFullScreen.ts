import type {BrowserWindow} from 'electron'

export async function setFullScreen(window: BrowserWindow, fullscreen: boolean): Promise<void> {
  if (window.isDestroyed() || window.isFullScreen() === fullscreen) return
  if (process.platform !== 'darwin') {
    window.setFullScreen(fullscreen)
    return
  }

  // macOS fullscreen transitions are asynchronous. Wait for the native event,
  // rather than delaying every platform for a fixed second.
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      if (fullscreen) window.removeListener('enter-full-screen', done)
      else window.removeListener('leave-full-screen', done)
      window.removeListener('closed', done)
    }
    const done = () => { cleanup(); resolve() }
    if (fullscreen) window.once('enter-full-screen', done)
    else window.once('leave-full-screen', done)
    window.once('closed', done)
    try {
      window.setFullScreen(fullscreen)
    } catch (error) {
      cleanup()
      reject(error)
    }
  })
}
