import express from "express";

export default class WebServer {
  /**
   * @type {import(express).core.Express}
   */
  expressServer = null
  /**
   * @type {import(electron).BrowserWindow}
   */
  mainWindow = null
  isRunning = false
  /**
   * @type {http.Server}
   */
  httpServer = null
  port = null

  constructor(mainWindow) {
    this.mainWindow = mainWindow
    this.expressServer = express()
    this.expressServer.get('/', (req, res) => {
      res.send('Countdown')
    })
    this.expressServer.get('/set/:minutes', (req, res) => {
      this.mainWindow.webContents.send('remote-command', 'set', req.params['minutes'])
      res.send(200)
    })
    this.expressServer.get('/start/:minutes', (req, res) => {
      this.mainWindow.webContents.send('remote-command', 'start', req.params['minutes'])
      res.send(200)
    })
    this.expressServer.get('/start', (req, res) => {
      this.mainWindow.webContents.send('remote-command', 'start')
      res.send(200)
    })
    this.expressServer.get('/toggle-pause', (req, res) => {
      this.mainWindow.webContents.send('remote-command', 'togglePause')
      res.send(200)
    })
    this.expressServer.get('/pause', (req, res) => {
      this.mainWindow.webContents.send('remote-command', 'pause')
      res.send(200)
    })
    this.expressServer.get('/resume', (req, res) => {
      this.mainWindow.webContents.send('remote-command', 'resume')
      res.send(200)
    })
    this.expressServer.get('/reset', (req, res) => {
      this.mainWindow.webContents.send('remote-command', 'reset')
      res.send(200)
    })
  }

  start() {
    this.httpServer = this.expressServer.listen(this.port, () => {
      this.isRunning = true;
    })
  }

  stop() {
    this.httpServer.close(() => {
      this.isRunning = false;
    })
  }
}
