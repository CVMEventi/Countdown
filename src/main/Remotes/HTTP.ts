import fastify, {FastifyInstance, RequestGenericInterface} from 'fastify';
import FastifyWebSocket from '@fastify/websocket';
import {BrowserWindow, ipcMain} from "electron";
import Store from "electron-store";
import {DEFAULT_STORE} from "../../common/config";
import {TimerEngine} from "../TimerEngine";
import {TimerEngineWebSocketUpdate} from "../../common/TimerInterfaces";

const secondsPerMinute = 60;
const secondsPerHour = secondsPerMinute * 60;

interface TimeRequest extends RequestGenericInterface {
  Params: {
    hours: string,
    minutes: string,
    seconds: string,
  };
}

interface MessageRequest extends RequestGenericInterface {
  Params: {
    message: string,
  }
}

export default class HTTP {
  fastifyServer: FastifyInstance = null;
  timerEngine: TimerEngine = null;
  browserWindow: BrowserWindow = null;
  isRunning = false;
  port: number = null;

  lastError: unknown = null;

  constructor (timerEngine: TimerEngine, browserWindow: BrowserWindow) {
    this.timerEngine = timerEngine;
    this.browserWindow = browserWindow;
    this.reset()
    this.setupIpc();
  }

  reset() {
    this.fastifyServer = fastify();
    this.fastifyServer.register(FastifyWebSocket);

    this.setupRoutes()
  }

  setupRoutes() {

    this.fastifyServer.get('/', (req, res) => {
      res.send('Countdown')
    })
    this.fastifyServer.get<TimeRequest>('/set/:hours/:minutes/:seconds', (req, res) => {
      const hours = parseInt(req.params.hours);
      const minutes = parseInt(req.params.minutes);
      const seconds = parseInt(req.params.seconds);

      this.timerEngine.set(hours * secondsPerHour + minutes * secondsPerMinute + seconds);
      res.send(200)
    })
    this.fastifyServer.get<TimeRequest>('/start/:hours/:minutes/:seconds', (req, res) => {
      const hours = parseInt(req.params.hours);
      const minutes = parseInt(req.params.minutes);
      const seconds = parseInt(req.params.seconds);

      this.timerEngine.set(hours * secondsPerHour + minutes * secondsPerMinute + seconds);
      this.timerEngine.start();
      res.send(200)
    })
    this.fastifyServer.get('/start', (req, res) => {
      this.timerEngine.start();
      res.send(200)
    })
    this.fastifyServer.get('/toggle-pause', (req, res) => {
      this.timerEngine.toggleTimer();
      res.send(200)
    })
    this.fastifyServer.get('/pause', (req, res) => {
      this.timerEngine.pause()
      res.send(200)
    })
    this.fastifyServer.get('/resume', (req, res) => {
      this.timerEngine.resume();
      res.send(200)
    })
    this.fastifyServer.get('/reset', (req, res) => {
      this.timerEngine.reset();
      res.send(200)
    })
    this.fastifyServer.get<TimeRequest>('/jog-set/:hours/:minutes/:seconds', (req, res) => {
      const hours = parseInt(req.params.hours);
      const minutes = parseInt(req.params.minutes);
      const seconds = parseInt(req.params.seconds);

      this.timerEngine.jogSet(hours * secondsPerHour + minutes * secondsPerMinute + seconds);
      res.send(200)
    })
    this.fastifyServer.get<TimeRequest>('/jog-current/:hours/:minutes/:seconds', (req, res) => {
      const hours = parseInt(req.params.hours);
      const minutes = parseInt(req.params.minutes);
      const seconds = parseInt(req.params.seconds);

      this.timerEngine.jogCurrent(hours * secondsPerHour + minutes * secondsPerMinute + seconds);
      res.send(200)
    })

    this.fastifyServer.get('/message', (req, res) => {
      this.timerEngine.setMessage("");
      res.send(200);
    })
    this.fastifyServer.get<MessageRequest>('/message/:message', (req, res) => {
      this.timerEngine.setMessage(req.params.message);
      res.send(200);
    })

    this.fastifyServer.register(async function (fastify) {
      fastify.get('/ws', { websocket: true }, () => {});
    })

  }

  sendToWebSocket(payload: TimerEngineWebSocketUpdate): void {
    if (!this.fastifyServer.websocketServer) {
      return;
    }
    this.fastifyServer.websocketServer.clients.forEach(function each(client) {
      if (client.readyState === 1) {
        client.send(JSON.stringify(payload))
      }
    })
  }

  setupIpc(): void {

    ipcMain.handle('server-running', () => {
      return this.buildStatusUpdateContent()
    })

    ipcMain.handle('webserver-manager', async (event, command) => {
      switch (command) {
        case 'stop':
          await this.stop()
          return false
        case 'start': {
          const store = new Store(DEFAULT_STORE);
          this.port = store.get('settings.webServerPort') == null
            ? 6565
            : store.get('settings.webServerPort')
          return await this.start()
        }
      }
    })
  }

  async start () {
    const promise = new Promise((resolve) => {
      this.fastifyServer.listen({ port: this.port, host: '0.0.0.0' }, err => {
        if (err) {
          this.isRunning = false
          this.lastError = err.message
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
    const promise = new Promise((resolve) => {
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
    this.browserWindow.webContents.send('webserver-update', this.buildStatusUpdateContent())
  }

  buildStatusUpdateContent() {
    return {
      port: this.port,
      isRunning: this.isRunning,
      lastError: this.lastError,
    }
  }
}
