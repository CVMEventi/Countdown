import BrowserWinHandler from './BrowserWinHandler'

const winHandler = new BrowserWinHandler({
  height: 800,
  width: 1400
})

winHandler.onCreated(_browserWindow => {
  winHandler.loadPage('/')
  // Or load custom url
  // _browserWindow.loadURL('https://google.com')
})

export default winHandler
