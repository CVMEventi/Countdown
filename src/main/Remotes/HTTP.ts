import fastify, {FastifyInstance, RequestGenericInterface} from 'fastify';
import FastifyWebSocket from '@fastify/websocket';
import {BrowserWindow, ipcMain} from "electron";
import {TimerEngineWebSocketUpdate, WebSocketUpdate} from '../../common/TimerInterfaces.ts'
import {TimersOrchestrator} from "../Utilities/TimersOrchestrator.ts";
// @ts-ignore
import {WebSocket} from "ws";

const secondsPerMinute = 60;
const secondsPerHour = secondsPerMinute * 60;

interface TimeRequest extends RequestGenericInterface {
  Params: {
    timerId: string,
    hours: string,
    minutes: string,
    seconds: string,
  };
}

interface MessageRequest extends RequestGenericInterface {
  Params: {
    timerId: string,
    message: string,
  }
}

interface GenericRequest extends RequestGenericInterface {
  Params: {
    timerId: string,
  }
}

export default class HTTP {
  fastifyServer: FastifyInstance = null;
  timersOrchestrator: TimersOrchestrator = null;
  browserWindow: BrowserWindow = null;
  isRunning = false;
  port: number = null;

  lastError: unknown = null;

  constructor (timersOrchestrator: TimersOrchestrator, browserWindow: BrowserWindow) {
    this.timersOrchestrator = timersOrchestrator;
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

    this.fastifyServer.get<TimeRequest>('/timer/:timerId/set/:hours/:minutes/:seconds', (req, res) => {
      const hours = parseInt(req.params.hours);
      const minutes = parseInt(req.params.minutes);
      const seconds = parseInt(req.params.seconds);

      if (!Object.keys(this.timersOrchestrator.timers).includes(req.params.timerId)) {
        return res.send(404)
      }

      this.timersOrchestrator.timers[req.params.timerId].engine.set(hours * secondsPerHour + minutes * secondsPerMinute + seconds);
      res.send(200)
    })
    this.fastifyServer.get<TimeRequest>('/timer/:timerId/start/:hours/:minutes/:seconds', (req, res) => {
      const hours = parseInt(req.params.hours);
      const minutes = parseInt(req.params.minutes);
      const seconds = parseInt(req.params.seconds);

      if (!Object.keys(this.timersOrchestrator.timers).includes(req.params.timerId)) {
        return res.send(404)
      }

      this.timersOrchestrator.timers[req.params.timerId].engine.set(hours * secondsPerHour + minutes * secondsPerMinute + seconds);
      this.timersOrchestrator.timers[req.params.timerId].engine.start();
      res.send(200)
    })
    this.fastifyServer.get<GenericRequest>('/timer/:timerId/start', (req, res) => {
      if (!Object.keys(this.timersOrchestrator.timers).includes(req.params.timerId)) {
        return res.send(404)
      }
      this.timersOrchestrator.timers[req.params.timerId].engine.start();
      res.send(200)
    })
    this.fastifyServer.get<GenericRequest>('/timer/:timerId/toggle-pause', (req, res) => {
      if (!Object.keys(this.timersOrchestrator.timers).includes(req.params.timerId)) {
        return res.send(404)
      }
      this.timersOrchestrator.timers[req.params.timerId].engine.toggleTimer();
      res.send(200)
    })
    this.fastifyServer.get<GenericRequest>('/timer/:timerId/pause', (req, res) => {
      if (!Object.keys(this.timersOrchestrator.timers).includes(req.params.timerId)) {
        return res.send(404)
      }
      this.timersOrchestrator.timers[req.params.timerId].engine.pause()
      res.send(200)
    })
    this.fastifyServer.get<GenericRequest>('/timer/:timerId/resume', (req, res) => {
      if (!Object.keys(this.timersOrchestrator.timers).includes(req.params.timerId)) {
        return res.send(404)
      }
      this.timersOrchestrator.timers[req.params.timerId].engine.resume();
      res.send(200)
    })
    this.fastifyServer.get<GenericRequest>('/timer/:timerId/reset', (req, res) => {
      if (!Object.keys(this.timersOrchestrator.timers).includes(req.params.timerId)) {
        return res.send(404)
      }
      this.timersOrchestrator.timers[req.params.timerId].engine.reset();
      res.send(200)
    })
    this.fastifyServer.get<TimeRequest>('/timer/:timerId/jog-set/:hours/:minutes/:seconds', (req, res) => {
      const hours = parseInt(req.params.hours);
      const minutes = parseInt(req.params.minutes);
      const seconds = parseInt(req.params.seconds);

      if (!Object.keys(this.timersOrchestrator.timers).includes(req.params.timerId)) {
        return res.send(404)
      }
      this.timersOrchestrator.timers[req.params.timerId].engine.jogSet(hours * secondsPerHour + minutes * secondsPerMinute + seconds);
      res.send(200)
    })
    this.fastifyServer.get<TimeRequest>('/timer/:timerId/jog-current/:hours/:minutes/:seconds', (req, res) => {
      const hours = parseInt(req.params.hours);
      const minutes = parseInt(req.params.minutes);
      const seconds = parseInt(req.params.seconds);

      if (!Object.keys(this.timersOrchestrator.timers).includes(req.params.timerId)) {
        return res.send(404)
      }
      this.timersOrchestrator.timers[req.params.timerId].engine.jogCurrent(hours * secondsPerHour + minutes * secondsPerMinute + seconds);
      res.send(200)
    })

    this.fastifyServer.get<GenericRequest>('/timer/:timerId/message', (req, res) => {
      if (!Object.keys(this.timersOrchestrator.timers).includes(req.params.timerId)) {
        return res.send(404)
      }
      this.timersOrchestrator.timers[req.params.timerId].engine.setMessage("");
      res.send(200);
    })
    this.fastifyServer.get<MessageRequest>('/timer/:timerId/message/:message', (req, res) => {
      if (!Object.keys(this.timersOrchestrator.timers).includes(req.params.timerId)) {
        return res.send(404)
      }
      this.timersOrchestrator.timers[req.params.timerId].engine.setMessage(req.params.message);
      res.send(200);
    })
    this.fastifyServer.get('/timers', (req, res) => {
      res
        .code(200)
        .header('Content-Type', 'application/json; charset=utf-8')
        .send(this.timersOrchestrator.app.config.settings.timers);
    })

    /* Legacy */
    this.fastifyServer.get<TimeRequest>('/set/:hours/:minutes/:seconds', (req, res) => {
      const hours = parseInt(req.params.hours);
      const minutes = parseInt(req.params.minutes);
      const seconds = parseInt(req.params.seconds);

      const firstTimer = Object.keys(this.timersOrchestrator.timers).sort()[0]
      this.timersOrchestrator.timers[firstTimer].engine.set(hours * secondsPerHour + minutes * secondsPerMinute + seconds);
      res.send(200)
    })
    this.fastifyServer.get<TimeRequest>('/start/:hours/:minutes/:seconds', (req, res) => {
      const hours = parseInt(req.params.hours);
      const minutes = parseInt(req.params.minutes);
      const seconds = parseInt(req.params.seconds);

      const firstTimer = Object.keys(this.timersOrchestrator.timers).sort()[0]

      this.timersOrchestrator.timers[firstTimer].engine.set(hours * secondsPerHour + minutes * secondsPerMinute + seconds);
      this.timersOrchestrator.timers[firstTimer].engine.start();
      res.send(200)
    })
    this.fastifyServer.get('/start', (req, res) => {
      const firstTimer = Object.keys(this.timersOrchestrator.timers).sort()[0]
      this.timersOrchestrator.timers[firstTimer].engine.start();
      res.send(200)
    })
    this.fastifyServer.get('/toggle-pause', (req, res) => {
      const firstTimer = Object.keys(this.timersOrchestrator.timers).sort()[0]
      this.timersOrchestrator.timers[firstTimer].engine.toggleTimer();
      res.send(200)
    })
    this.fastifyServer.get('/pause', (req, res) => {
      const firstTimer = Object.keys(this.timersOrchestrator.timers).sort()[0]
      this.timersOrchestrator.timers[firstTimer].engine.pause()
      res.send(200)
    })
    this.fastifyServer.get('/resume', (req, res) => {
      const firstTimer = Object.keys(this.timersOrchestrator.timers).sort()[0]
      this.timersOrchestrator.timers[firstTimer].engine.resume();
      res.send(200)
    })
    this.fastifyServer.get('/reset', (req, res) => {
      const firstTimer = Object.keys(this.timersOrchestrator.timers).sort()[0]
      this.timersOrchestrator.timers[firstTimer].engine.reset();
      res.send(200)
    })
    this.fastifyServer.get<TimeRequest>('/jog-set/:hours/:minutes/:seconds', (req, res) => {
      const hours = parseInt(req.params.hours);
      const minutes = parseInt(req.params.minutes);
      const seconds = parseInt(req.params.seconds);

      const firstTimer = Object.keys(this.timersOrchestrator.timers).sort()[0]
      this.timersOrchestrator.timers[firstTimer].engine.jogSet(hours * secondsPerHour + minutes * secondsPerMinute + seconds);
      res.send(200)
    })
    this.fastifyServer.get<TimeRequest>('/jog-current/:hours/:minutes/:seconds', (req, res) => {
      const hours = parseInt(req.params.hours);
      const minutes = parseInt(req.params.minutes);
      const seconds = parseInt(req.params.seconds);

      const firstTimer = Object.keys(this.timersOrchestrator.timers).sort()[0]
      this.timersOrchestrator.timers[firstTimer].engine.jogCurrent(hours * secondsPerHour + minutes * secondsPerMinute + seconds);
      res.send(200)
    })

    this.fastifyServer.get('/message', (req, res) => {
      const firstTimer = Object.keys(this.timersOrchestrator.timers).sort()[0]
      this.timersOrchestrator.timers[firstTimer].engine.setMessage("");
      res.send(200);
    })
    this.fastifyServer.get<MessageRequest>('/message/:message', (req, res) => {
      const firstTimer = Object.keys(this.timersOrchestrator.timers).sort()[0]
      this.timersOrchestrator.timers[firstTimer].engine.setMessage(req.params.message);
      res.send(200);
    })

    this.fastifyServer.register(async function (fastify) {
      fastify.get('/ws', { websocket: true }, () => {});
    })

  }

  sendToWebSocket(update: WebSocketUpdate<any>): void {
    if (!this.fastifyServer.websocketServer) {
      return;
    }
    this.fastifyServer.websocketServer.clients.forEach(function each(client: WebSocket) {
      if (client.readyState === 1) {
        client.send(JSON.stringify(update))
      }
    })
  }

  setupIpc(): void {

    ipcMain.handle('server-running', () => {
      return this.buildStatusUpdateContent()
    })

    ipcMain.handle('webserver-manager', async (event, command, port) => {
      switch (command) {
        case 'stop':
          await this.stop()
          return false
        case 'start': {
          this.port = parseInt(port) ?? 6565
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
