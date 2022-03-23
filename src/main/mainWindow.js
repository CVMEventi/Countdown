import BrowserWinHandler from './BrowserWinHandler'

export default function createMainWindow (options = {
  height: 800,
  width: 1400
}) {
  const winHandler = new BrowserWinHandler(options)

  winHandler.onCreated(_browserWindow => {
    winHandler.loadPage('/')
    // Or load custom url
    // _browserWindow.loadURL('https://google.com')
  })

  return winHandler
}
