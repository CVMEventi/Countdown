import fastify, {FastifyInstance, FastifyRequest, RequestGenericInterface} from 'fastify';
import FastifyWebSocket from '@fastify/websocket';
import FastifyStatic from '@fastify/static';
import {BrowserWindow, ipcMain, app} from "electron";
import path from 'path';
import fs from 'fs';
import {TimerEngineWebSocketUpdate, WebSocketUpdate} from '../../common/TimerInterfaces.ts'
import {TimersOrchestrator} from "../Utilities/TimersOrchestrator.ts";
import {TimerEngine} from "../TimerEngine.ts";
// @ts-ignore
import {WebSocket} from "ws";

declare const REMOTE_WEBPACK_ENTRY: string;

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

  private timerEngine(timerId: string): TimerEngine {
    return this.timersOrchestrator.timers[timerId].engine
  }

  private firstTimerEngine(): TimerEngine | null {
    const timerId = Object.keys(this.timersOrchestrator.timers).sort()[0]
    return timerId ? this.timersOrchestrator.timers[timerId].engine : null
  }

  private parseHms(params: { hours: string, minutes: string, seconds: string }): number {
    return parseInt(params.hours) * secondsPerHour
      + parseInt(params.minutes) * secondsPerMinute
      + parseInt(params.seconds)
  }

  setupRoutes() {
    if (app.isPackaged) {
      const rendererPath = path.join(process.resourcesPath, 'app.asar/.webpack/renderer');

      this.fastifyServer.register(FastifyStatic, {
        root: rendererPath,
        prefix: '/',
      });
      this.fastifyServer.get('/remote', (req, res) => {
        res.sendFile(path.join(rendererPath, 'remote/index.html'));
      });
    } else {
      this.fastifyServer.get('/remote', async (req, res) => {
        const r = await fetch(REMOTE_WEBPACK_ENTRY);
        res.header('content-type', 'text/html').send(await r.text());
      });
      this.fastifyServer.get('/remote/*', async (req, res) => {
        const asset = (req.params as { '*': string })['*'];
        const remotePath = REMOTE_WEBPACK_ENTRY.replace('index.html', '');
        const r = await fetch(`${remotePath}/${asset}`);
        const contentType = r.headers.get('content-type') || 'application/octet-stream';
        res.header('content-type', contentType).send(Buffer.from(await r.arrayBuffer()));
      });
    }

    this.fastifyServer.get('/', (req, res) => {
      res.send('Countdown')
    })

    this.fastifyServer.get('/timers', (req, res) => {
      res
        .code(200)
        .header('Content-Type', 'application/json; charset=utf-8')
        .send(this.timersOrchestrator.app.config.settings.timers);
    })

    this.fastifyServer.register(async (timerRoutes) => {
      timerRoutes.addHook('preHandler', (req: FastifyRequest<GenericRequest>, reply, done) => {
        if (!this.timersOrchestrator.timers[req.params.timerId]) {
          return reply.code(404).send()
        }
        done()
      })

      timerRoutes.get<TimeRequest>('/set/:hours/:minutes/:seconds', (req, res) => {
        this.timerEngine(req.params.timerId).set(this.parseHms(req.params))
        res.code(200).send()
      })
      timerRoutes.get<TimeRequest>('/start/:hours/:minutes/:seconds', (req, res) => {
        const engine = this.timerEngine(req.params.timerId)
        engine.set(this.parseHms(req.params))
        engine.start()
        res.code(200).send()
      })
      timerRoutes.get<GenericRequest>('/start', (req, res) => {
        this.timerEngine(req.params.timerId).start()
        res.code(200).send()
      })
      timerRoutes.get<GenericRequest>('/toggle-pause', (req, res) => {
        this.timerEngine(req.params.timerId).toggleTimer()
        res.code(200).send()
      })
      timerRoutes.get<GenericRequest>('/pause', (req, res) => {
        this.timerEngine(req.params.timerId).pause()
        res.code(200).send()
      })
      timerRoutes.get<GenericRequest>('/resume', (req, res) => {
        this.timerEngine(req.params.timerId).resume()
        res.code(200).send()
      })
      timerRoutes.get<GenericRequest>('/reset', (req, res) => {
        this.timerEngine(req.params.timerId).reset()
        res.code(200).send()
      })
      timerRoutes.get<TimeRequest>('/jog-set/:hours/:minutes/:seconds', (req, res) => {
        this.timerEngine(req.params.timerId).jogSet(this.parseHms(req.params))
        res.code(200).send()
      })
      timerRoutes.get<TimeRequest>('/jog-current/:hours/:minutes/:seconds', (req, res) => {
        this.timerEngine(req.params.timerId).jogCurrent(this.parseHms(req.params))
        res.code(200).send()
      })
      timerRoutes.get<GenericRequest>('/message', (req, res) => {
        this.timerEngine(req.params.timerId).setMessage('')
        res.code(200).send()
      })
      timerRoutes.get<MessageRequest>('/message/:message', (req, res) => {
        this.timerEngine(req.params.timerId).setMessage(req.params.message)
        res.code(200).send()
      })
    }, { prefix: '/timer/:timerId' })

    /* Legacy */
    this.fastifyServer.get<TimeRequest>('/set/:hours/:minutes/:seconds', (req, res) => {
      const engine = this.firstTimerEngine()
      if (!engine) return res.code(404).send()
      engine.set(this.parseHms(req.params))
      res.code(200).send()
    })
    this.fastifyServer.get<TimeRequest>('/start/:hours/:minutes/:seconds', (req, res) => {
      const engine = this.firstTimerEngine()
      if (!engine) return res.code(404).send()
      engine.set(this.parseHms(req.params))
      engine.start()
      res.code(200).send()
    })
    this.fastifyServer.get('/start', (req, res) => {
      const engine = this.firstTimerEngine()
      if (!engine) return res.code(404).send()
      engine.start()
      res.code(200).send()
    })
    this.fastifyServer.get('/toggle-pause', (req, res) => {
      const engine = this.firstTimerEngine()
      if (!engine) return res.code(404).send()
      engine.toggleTimer()
      res.code(200).send()
    })
    this.fastifyServer.get('/pause', (req, res) => {
      const engine = this.firstTimerEngine()
      if (!engine) return res.code(404).send()
      engine.pause()
      res.code(200).send()
    })
    this.fastifyServer.get('/resume', (req, res) => {
      const engine = this.firstTimerEngine()
      if (!engine) return res.code(404).send()
      engine.resume()
      res.code(200).send()
    })
    this.fastifyServer.get('/reset', (req, res) => {
      const engine = this.firstTimerEngine()
      if (!engine) return res.code(404).send()
      engine.reset()
      res.code(200).send()
    })
    this.fastifyServer.get<TimeRequest>('/jog-set/:hours/:minutes/:seconds', (req, res) => {
      const engine = this.firstTimerEngine()
      if (!engine) return res.code(404).send()
      engine.jogSet(this.parseHms(req.params))
      res.code(200).send()
    })
    this.fastifyServer.get<TimeRequest>('/jog-current/:hours/:minutes/:seconds', (req, res) => {
      const engine = this.firstTimerEngine()
      if (!engine) return res.code(404).send()
      engine.jogCurrent(this.parseHms(req.params))
      res.code(200).send()
    })
    this.fastifyServer.get('/message', (req, res) => {
      const engine = this.firstTimerEngine()
      if (!engine) return res.code(404).send()
      engine.setMessage('')
      res.code(200).send()
    })
    this.fastifyServer.get<MessageRequest>('/message/:message', (req, res) => {
      const engine = this.firstTimerEngine()
      if (!engine) return res.code(404).send()
      engine.setMessage(req.params.message)
      res.code(200).send()
    })

    this.fastifyServer.register(async function (fastify) {
      fastify.get('/ws', { websocket: true }, () => {});
    })
  }

  sendToWebSocket(update: WebSocketUpdate<TimerEngineWebSocketUpdate>): void {
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
