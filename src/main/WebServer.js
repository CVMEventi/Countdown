import express from 'express'
import expressWs from 'express-ws';
import Fastify from 'fastify';
import FastifyWebSocket from '@fastify/websocket';
import {ipcMain} from "electron";
import http from "http";
import Store from "electron-store";
import {DEFAULT_STORE} from "../common/constants";

export default class WebServer {
  /**
   * @type {import(fastify).default}
   */
  fastifyServer = null
  /**
   * @type {import(electron).BrowserWindow}
   */
  mainWindow = null
  isRunning = false
  port = null

  lastError = null

  constructor (mainWindow) {
    this.mainWindow = mainWindow
    this.reset()
    this.setupIpc();
  }

  reset() {
    this.fastifyServer = new Fastify({
      logger: true,
    })
    this.fastifyServer.register(FastifyWebSocket);

    this.setupRoutes()
  }

  setupRoutes() {

    this.fastifyServer.get('/', (req, res) => {
      res.send('Countdown')
    })
    this.fastifyServer.get('/set/:hours/:minutes/:seconds', (req, res) => {
      this.mainWindow.webContents.send(
        'remote-command',
        'set',
        req.params.hours,
        req.params.minutes,
        req.params.seconds
      )
      res.send(200)
    })
    this.fastifyServer.get('/start/:hours/:minutes/:seconds', (req, res) => {
      this.mainWindow.webContents.send(
        'remote-command',
        'start',
        req.params.hours,
        req.params.minutes,
        req.params.seconds
      )
      res.send(200)
    })
    this.fastifyServer.get('/start', (req, res) => {
      this.mainWindow.webContents.send('remote-command', 'start')
      res.send(200)
    })
    this.fastifyServer.get('/toggle-pause', (req, res) => {
      this.mainWindow.webContents.send('remote-command', 'togglePause')
      res.send(200)
    })
    this.fastifyServer.get('/pause', (req, res) => {
      this.mainWindow.webContents.send('remote-command', 'pause')
      res.send(200)
    })
    this.fastifyServer.get('/resume', (req, res) => {
      this.mainWindow.webContents.send('remote-command', 'resume')
      res.send(200)
    })
    this.fastifyServer.get('/reset', (req, res) => {
      this.mainWindow.webContents.send('remote-command', 'reset')
      res.send(200)
    })
    this.fastifyServer.get('/jog-set/:hours/:minutes/:seconds', (req, res) => {
      this.mainWindow.webContents.send(
        'remote-command',
        'jog-set',
        req.params.hours,
        req.params.minutes,
        req.params.seconds
      )
      res.send(200)
    })
    this.fastifyServer.get('/jog-current/:hours/:minutes/:seconds', (req, res) => {
      this.mainWindow.webContents.send(
        'remote-command',
        'jog-current',
        req.params.hours,
        req.params.minutes,
        req.params.seconds
      )
      res.send(200)
    })

    this.fastifyServer.register(async function (fastify) {
      fastify.get('/ws', { websocket: true }, (connection /* SocketStream */, req /* FastifyRequest */) => {

      })
    })

  }

  setupIpc() {
    ipcMain.on('send-to-websocket', (event, arg) => {
      if (!this.fastifyServer.websocketServer) {
        return;
      }
      this.fastifyServer.websocketServer.clients.forEach(function each(client) {
        if (client.readyState === 1) {
          client.send(JSON.stringify(arg))
        }
      })
    })

    ipcMain.handle('server-running', () => {
      return this.buildStatusUpdateContent()
    })

    ipcMain.handle('webserver-manager', async (event, command, arg) => {
      switch (command) {
        case 'stop':
          await this.stop()
          return false
        case 'start':
          let store = new Store(DEFAULT_STORE);
          this.port = store.get('settings.webServerPort') === null
            ? 6565
            : store.get('settings.webServerPort')
          return await this.start()
      }
    })
  }

  async start () {
    let promise = new Promise((resolve, reject) => {
      this.fastifyServer.listen({ port: this.port, host: '0.0.0.0' }, err => {
        if (err) {
          this.isRunning = false
          this.lastError = err.code
          this.sendIpcStatusUpdate()
          resolve(false)
          return
        }
        this.isRunning = true
        this.lastError = null
        resolve(true);
        this.sendIpcStatusUpdate()
      })
    })

    return await promise;
  }

  async stop () {
    let promise = new Promise((resolve, reject) => {
      this.fastifyServer.close(() => {
        this.reset();
        this.isRunning = false
        this.sendIpcStatusUpdate()
        resolve(true)
      })
    })

    return await promise
  }

  sendIpcStatusUpdate() {
    this.mainWindow.webContents.send('webserver-update', this.buildStatusUpdateContent())
  }

  buildStatusUpdateContent() {
    return {
      port: this.port,
      isRunning: this.isRunning,
      lastError: this.lastError,
    }
  }
}
