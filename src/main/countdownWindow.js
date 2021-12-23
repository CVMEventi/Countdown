import BrowserWinHandler from './BrowserWinHandler'

const winHandler = new BrowserWinHandler({
  height: 720,
  width: 1280,
  // fullscreen: true
  frame: false,
  enableLargerThanScreen: true
})

winHandler.onCreated(_browserWindow => {
  winHandler.loadPage('/countdown')
  // _browserWindow.toggleDevTools()
})

export default winHandler
