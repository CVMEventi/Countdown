import BrowserWinHandler from './Utilities/BrowserWinHandler.ts'

// The peer lives in a renderer because the main process has no RTCPeerConnection. It gets its
// own window rather than sharing the control window, whose bundle countdown windows also load.
export default function createWebRtcHostWindow() {
  const winHandler = new BrowserWinHandler({
    width: 400,
    height: 300,
    show: false,
    skipTaskbar: true,
    title: 'Countdown Web Remote',
  })

  return {
    get browserWindow() {
      return winHandler.browserWindow
    },
    loadPage: async (path: string) => {
      await winHandler.created()
      await winHandler.loadPage(path)
    },
    destroy: () => {
      const window = winHandler.browserWindow
      if (window && !window.isDestroyed()) window.destroy()
    },
  }
}
