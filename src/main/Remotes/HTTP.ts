import fastify, {FastifyInstance, RequestGenericInterface} from 'fastify';
import FastifyWebSocket from '@fastify/websocket';
import {BrowserWindow, ipcMain} from "electron";
import {TimerEngineWebSocketUpdate} from "../../common/TimerInterfaces";
import {TimersOrchestrator} from "../Utilities/TimersOrchestrator";

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
    this.fastifyServer.get<TimeRequest>('/set/:hours/:minutes/:seconds', (req, res) => {
      const hours = parseInt(req.params.hours);
      const minutes = parseInt(req.params.minutes);
      const seconds = parseInt(req.params.seconds);

      this.timersOrchestrator.timers[0].engine.set(hours * secondsPerHour + minutes * secondsPerMinute + seconds);
      res.send(200)
    })
    this.fastifyServer.get<TimeRequest>('/start/:hours/:minutes/:seconds', (req, res) => {
      const hours = parseInt(req.params.hours);
      const minutes = parseInt(req.params.minutes);
      const seconds = parseInt(req.params.seconds);

      this.timersOrchestrator.timers[0].engine.set(hours * secondsPerHour + minutes * secondsPerMinute + seconds);
      this.timersOrchestrator.timers[0].engine.start();
      res.send(200)
    })
    this.fastifyServer.get('/start', (req, res) => {
      this.timersOrchestrator.timers[0].engine.start();
      res.send(200)
    })
    this.fastifyServer.get('/toggle-pause', (req, res) => {
      this.timersOrchestrator.timers[0].engine.toggleTimer();
      res.send(200)
    })
    this.fastifyServer.get('/pause', (req, res) => {
      this.timersOrchestrator.timers[0].engine.pause()
      res.send(200)
    })
    this.fastifyServer.get('/resume', (req, res) => {
      this.timersOrchestrator.timers[0].engine.resume();
      res.send(200)
    })
    this.fastifyServer.get('/reset', (req, res) => {
      this.timersOrchestrator.timers[0].engine.reset();
      res.send(200)
    })
    this.fastifyServer.get<TimeRequest>('/jog-set/:hours/:minutes/:seconds', (req, res) => {
      const hours = parseInt(req.params.hours);
      const minutes = parseInt(req.params.minutes);
      const seconds = parseInt(req.params.seconds);

      this.timersOrchestrator.timers[0].engine.jogSet(hours * secondsPerHour + minutes * secondsPerMinute + seconds);
      res.send(200)
    })
    this.fastifyServer.get<TimeRequest>('/jog-current/:hours/:minutes/:seconds', (req, res) => {
      const hours = parseInt(req.params.hours);
      const minutes = parseInt(req.params.minutes);
      const seconds = parseInt(req.params.seconds);

      this.timersOrchestrator.timers[0].engine.jogCurrent(hours * secondsPerHour + minutes * secondsPerMinute + seconds);
      res.send(200)
    })

    this.fastifyServer.get('/message', (req, res) => {
      this.timersOrchestrator.timers[0].engine.setMessage("");
      res.send(200);
    })
    this.fastifyServer.get<MessageRequest>('/message/:message', (req, res) => {
      this.timersOrchestrator.timers[0].engine.setMessage(req.params.message);
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
    this.fastifyServer.websocketServer.clients.forEach(function each(client: any) {
      if (client.readyState === 1) {
        client.send(JSON.stringify(payload))
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
