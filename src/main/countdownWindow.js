import BrowserWinHandler from './Utilities/BrowserWinHandler'

export default function createCountdownWindow (options) {
  const winHandler = new BrowserWinHandler({...options, title: 'Countdown'})

  winHandler.onCreated(_browserWindow => {
    winHandler.loadPage('/countdown')
    // _browserWindow.toggleDevTools()
  })

  return winHandler
}
