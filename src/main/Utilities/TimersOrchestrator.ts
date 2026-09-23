import {
  ColorThreshold,
  TimerSettings,
  WindowSettings
} from "../../common/config.ts";
import {TimerEngine, TimerEngineConstructorOptions, TimerEngineOptions} from "../TimerEngine.ts";
import {playbackSourceLabel, type PlaybackState} from "../../common/playback.ts";
import {playbackTemplateVars, renderMessageTemplate} from "../../common/messageTemplate.ts";
import {PlaybackMessageTracker} from "../Playback/PlaybackMessageTracker.ts";
import BrowserWinHandler from "./BrowserWinHandler.ts";
import createCountdownWindow from "../countdownWindow.ts";
import {BrowserWindow, powerMonitor, screen} from "electron";
import {
  AnyWebSocketUpdate,
  MessageUpdate,
  TimerEngineUpdate,
  TimerEngineWebSocketUpdate,
  TimerSnapshot
} from "../../common/TimerInterfaces.ts";
import {CountdownApp} from "../App.ts";
import {sleep} from "./utilities.ts";
import {promises as fs} from "node:fs";
// @ts-ignore
import mime from "mime/lite";
import NDIManager from "../Remotes/NDI.ts";
import OMTManager from "../Remotes/OMT.ts";
import {TransportRegistry} from "../Remotes/TransportRegistry.ts";
import {sanitizeTimersForWire} from "../../common/protocol.ts";
import type {TimerTransport} from "../Remotes/TimerTransport.ts";

interface WindowsKV {
  [key: string]: BrowserWinHandler;
}

interface NDIManagersKV {
  [key: string]: NDIManager;
}

interface OMTManagersKV {
  [key: string]: OMTManager;
}

interface SingleTimer {
  settings: TimerSettings
  engine: TimerEngine
  windows: WindowsKV
  ndiServers: NDIManagersKV
  omtServers: OMTManagersKV
}

interface TimersKV {
  [key: string]: SingleTimer
}

// Moving or resizing a window fires a burst of events: wait for it to settle before saving the bounds
const WINDOW_BOUNDS_SYNC_DELAY_MS = 300

export class TimersOrchestrator {
  app: CountdownApp
  timers: TimersKV = {}
  currentTimer: string|null = null
  // Timers whose end sound is playing in the main window
  playingSounds = new Set<string>()
  // Windows being placed from settings: their bounds change on purpose and must not be saved back
  private _positioningWindows = new WeakSet<BrowserWinHandler>()
  // Remotes that broadcast state to clients. Empty until App builds them once the main window
  // exists, so broadcasts before that are harmlessly dropped rather than throwing
  private _transports = new TransportRegistry()
  // Latest state per playback provider, so a timer created or re-pointed mid clip joins at once
  private _playbackStates = new Map<string, PlaybackState>()
  private _playbackMessages = new Map<string, PlaybackMessageTracker>()

  constructor(app: CountdownApp) {
    this.app = app
    Object.keys(app.config.settings.timers).forEach(timerId => {
      this.createTimer(timerId, app.config.settings.timers[timerId]);
    })
    this._compensateSystemSleep()
  }

  // performance.now() may not advance while the system sleeps: add the missing wall-clock time on resume
  private _compensateSystemSleep() {
    let suspendedAt: { wall: number, mono: number } | null = null

    powerMonitor.on('suspend', () => {
      suspendedAt = { wall: Date.now(), mono: performance.now() }
    })

    powerMonitor.on('resume', () => {
      if (!suspendedAt) return
      const missedMs = (Date.now() - suspendedAt.wall) - (performance.now() - suspendedAt.mono)
      suspendedAt = null
      if (missedMs <= 0) return
      Object.values(this.timers).forEach(timer => timer.engine.advanceClock(missedMs))
    })
  }

  public createTimer(timerId: string, settings: TimerSettings) {
    const colorThresholds: ColorThreshold[] = Object.values(settings.windows).flatMap(w => w.colors?.thresholds ?? [])
    const options: TimerEngineOptions = {
      stopTimerAtZero: settings.stopTimerAtZero,
      setTimeLive: settings.setTimeLive,
      audioFile: settings.audioFile,
      colorThresholds,
    }

    const constructorOptions: TimerEngineConstructorOptions = {
      interval: settings.timerDuration,
      options,
      onUpdate: (update: TimerEngineUpdate) => {
        this._timerEngineUpdate(timerId, update)
      },
      onWebSocketUpdate: (update: TimerEngineWebSocketUpdate) => {
        this._timerEngineWebSocketUpdate(timerId, {
          timerId,
          ...update
        })
      },
      onMessageUpdate: (update: MessageUpdate) => {
        this._timerEngineMessageUpdate(timerId, {
          ...update,
          timerId,
        })
      },
      onPlaySound: async (audioFilePath) => {
        await this._playSound(timerId, audioFilePath)
      }
    }
    const timerEngine = new TimerEngine(constructorOptions)

    let windows: WindowsKV = {}
    Object.keys(settings.windows).forEach(windowId => {
      const windowSettings = settings.windows[windowId]
      windows[windowId] = this._createWindow(timerId, settings.name, windowId, windowSettings)
    })

    let ndiServers: NDIManagersKV = {}
    if (this.app.config.settings.remote.ndiEnabled) {
      Object.keys(settings.windows).forEach(windowId => {
        const server = new NDIManager(`Countdown ${settings.name}-${windowId}`)
        server.alpha = this.app.config.settings.remote.ndiAlpha;
        server.start()
        ndiServers[windowId] = server
      })
    }

    let omtServers: OMTManagersKV = {}
    if (this.app.config.settings.remote.omtEnabled) {
      Object.keys(settings.windows).forEach(windowId => {
        const server = new OMTManager(`Countdown ${settings.name}-${windowId}`)
        server.start()
        omtServers[windowId] = server
      })
    }

    this.timers[timerId] = {
      settings,
      engine: timerEngine,
      windows,
      ndiServers,
      omtServers,
    }

    this._applyPlaybackToTimer(timerId)
  }

  private _createWindow(timerId: string, timerName: string, windowId: string, windowSettings: WindowSettings) {
    const countdownWindowHandler = createCountdownWindow(timerId, timerName, windowId, {
      x: windowSettings.bounds.x,
      y: windowSettings.bounds.y,
      height: windowSettings.bounds.height,
      width: windowSettings.bounds.width,
      frame: false,
      enableLargerThanScreen: true,
      transparent: true,
      alwaysOnTop: windowSettings.bounds.alwaysOnTop,
      show: !windowSettings.bounds.hidden
    });

    countdownWindowHandler.onCreated(async function (browserWindow: BrowserWindow) {
      this._watchWindowBounds(timerId, windowId, countdownWindowHandler)
      await this._setCountdownWindowPosition(countdownWindowHandler, windowSettings);
    }.bind(this))

    return countdownWindowHandler
  }

  addTransport(transport: TimerTransport) {
    this._transports.add(transport)
  }

  removeTransport(transport: TimerTransport) {
    this._transports.remove(transport)
  }

  broadcast(update: AnyWebSocketUpdate) {
    this._transports.broadcast(update)
  }

  buildSnapshot(): TimerSnapshot {
    const timerEngine: { [timerId: string]: TimerEngineWebSocketUpdate } = {}
    const messages: { [timerId: string]: string | null } = {}

    Object.keys(this.timers).forEach((timerId) => {
      const engine = this.timers[timerId].engine
      timerEngine[timerId] = { timerId, ...engine.webSocketState() }
      messages[timerId] = engine.message ?? null
    })

    return {
      timers: sanitizeTimersForWire(this.app.config.settings.timers),
      timerEngine,
      messages,
      playingTimerIds: [...this.playingSounds],
    }
  }

  async _playSound(timerId: string, audioFilePath: string) {
    this.broadcast({
      type: 'audio',
      update: { timerId }
    })

    const mainBrowserWindow = this.app.mainWindowHandler.browserWindow;
    let audioFile;
    try {
      audioFile = await fs.readFile(audioFilePath, {encoding: 'base64'})
    } catch {
      return
    }
    const mimeType = mime.getType(audioFilePath)
    const deviceId = this.timers[timerId]?.settings.audioOutputDeviceId ?? null

    if (!mainBrowserWindow || mainBrowserWindow.isDestroyed()) return;
    mainBrowserWindow.webContents.send('audio:play', timerId, audioFile, mimeType, deviceId)
    this.setSoundPlaying(timerId, true)
  }

  stopSound(timerId: string) {
    this.broadcast({
      type: 'audioStop',
      update: { timerId }
    })

    this.setSoundPlaying(timerId, false)

    const mainBrowserWindow = this.app.mainWindowHandler.browserWindow;
    if (!mainBrowserWindow || mainBrowserWindow.isDestroyed()) return;
    mainBrowserWindow.webContents.send('audio:stop', timerId)
  }

  setSoundPlaying(timerId: string, playing: boolean) {
    if (playing === this.playingSounds.has(timerId)) return
    if (playing) {
      this.playingSounds.add(timerId)
    } else {
      this.playingSounds.delete(timerId)
    }

    const playingTimerIds = [...this.playingSounds]
    this.broadcast({
      type: 'audioState',
      update: { playingTimerIds }
    })

    const mainBrowserWindow = this.app.mainWindowHandler.browserWindow;
    if (!mainBrowserWindow || mainBrowserWindow.isDestroyed()) return;
    mainBrowserWindow.webContents.send('audio:state', playingTimerIds)
  }

  _timerEngineUpdate(timerId: string, update: TimerEngineUpdate) {
    const mainBrowserWindow = this.app.mainWindowHandler.browserWindow;
    if (mainBrowserWindow && !mainBrowserWindow.isDestroyed()) {
      mainBrowserWindow.webContents.send('update', timerId, update);
    }
    Object.keys(this.timers).forEach((timer) => {
      Object.keys(this.timers[timer].windows).forEach(windowId => {
        if (update.isReset
          && update.currentSeconds > 0
          && timerId !== timer) {
          return
        }
        const browserWinHandler = this.timers[timer].windows[windowId];
        const browserWindow = browserWinHandler.browserWindow;
        if (!browserWindow || browserWindow.isDestroyed()) return
        browserWinHandler.browserWindow.webContents.send('update', timerId, update);
      })
    })
  }

  _timerEngineWebSocketUpdate(timerId: string, update: TimerEngineWebSocketUpdate) {
    this.broadcast({
      type: 'timerEngine',
      update
    })
  }

  _configWebSocketUpdate() {
    this.broadcast({
      type: 'config',
      update: sanitizeTimersForWire(this.app.config.settings.timers)
    })
  }

  _timerEngineMessageUpdate(timerId: string, update: MessageUpdate) {
    this.broadcast({
      type: 'message',
      update
    })

    Object.keys(this.timers[timerId].windows).forEach(windowId => {
      const browserWinHandler = this.timers[timerId].windows[windowId];
      if (!browserWinHandler.browserWindow || browserWinHandler.browserWindow.isDestroyed()) return;
      browserWinHandler.browserWindow.webContents.send('message', update);
    })
  }

  // Keep settings in sync when the user moves or resizes a countdown window directly
  private _watchWindowBounds(timerId: string, windowId: string, windowHandler: BrowserWinHandler) {
    const browserWindow = windowHandler.browserWindow
    let syncTimeout: NodeJS.Timeout = null

    const scheduleSync = () => {
      clearTimeout(syncTimeout)
      syncTimeout = setTimeout(() => this._syncWindowBounds(timerId, windowId, windowHandler), WINDOW_BOUNDS_SYNC_DELAY_MS)
    }

    browserWindow.on('move', scheduleSync)
    browserWindow.on('resize', scheduleSync)
    browserWindow.on('closed', () => clearTimeout(syncTimeout))
  }

  private _syncWindowBounds(timerId: string, windowId: string, windowHandler: BrowserWinHandler) {
    const browserWindow = windowHandler.browserWindow
    if (!browserWindow || browserWindow.isDestroyed()) return
    if (this._positioningWindows.has(windowHandler) || browserWindow.isFullScreen()) return

    const windowSettings = this.app.config.settings.timers[timerId]?.windows[windowId]
    if (!windowSettings || windowSettings.bounds.fullscreenOn !== null) return

    const { x, y, width, height } = browserWindow.getBounds()
    const bounds = windowSettings.bounds
    if (bounds.x === x && bounds.y === y && bounds.width === width && bounds.height === height) return

    const newBounds = { ...bounds, x, y, width, height }
    this.app.config.set(`timers.${timerId}.windows.${windowId}.bounds`, newBounds)

    const mainBrowserWindow = this.app.mainWindowHandler.browserWindow
    if (mainBrowserWindow && !mainBrowserWindow.isDestroyed()) {
      mainBrowserWindow.webContents.send('window-bounds:updated', timerId, windowId, newBounds)
    }
  }

  async _setCountdownWindowPosition(countdownWindowHandler: BrowserWinHandler, windowSettings: WindowSettings) {
    this._positioningWindows.add(countdownWindowHandler)
    try {
      await this._applyCountdownWindowPosition(countdownWindowHandler, windowSettings)
    } finally {
      this._positioningWindows.delete(countdownWindowHandler)
    }
  }

  private async _applyCountdownWindowPosition(countdownWindowHandler: BrowserWinHandler, windowSettings: WindowSettings) {
    const browserWindow = countdownWindowHandler.browserWindow
    const fullscreenOn = windowSettings.bounds.fullscreenOn
    const selectedScreen = screen.getAllDisplays().find((display) => display.id === fullscreenOn)

    if (browserWindow.fullScreen && fullscreenOn === null) {
      browserWindow.setFullScreen(false)
      await sleep(1000);
    }
    if (fullscreenOn !== null) {
      await sleep(1000)
      browserWindow.setPosition(selectedScreen.bounds.x + 100, selectedScreen.bounds.y + 100)
      browserWindow.setFullScreen(true)
      return;
    }

    browserWindow.setBounds({
      x: windowSettings.bounds.x,
      y: windowSettings.bounds.y,
      height: windowSettings.bounds.height,
      width: windowSettings.bounds.width
    })

    browserWindow.setAlwaysOnTop(windowSettings.bounds.alwaysOnTop)
    if (windowSettings.bounds.hidden && browserWindow.isVisible()) {
      browserWindow.hide()
    } else if (!windowSettings.bounds.hidden && !browserWindow.isVisible()) {
      browserWindow.show()
    }
  }

  destroyWindow(timerId: string, windowId: string) {
    this.timers[timerId].windows[windowId].browserWindow.destroy()
    delete this.timers[timerId].windows[windowId]
    if (this.timers[timerId].ndiServers[windowId]) {
      this.timers[timerId].ndiServers[windowId].stop()
      delete this.timers[timerId].ndiServers[windowId]
    }
    if (this.timers[timerId].omtServers[windowId]) {
      this.timers[timerId].omtServers[windowId].stop()
      delete this.timers[timerId].omtServers[windowId]
    }
  }

  destroyTimer(timerId: string) {
    Object.keys(this.timers[timerId].windows).forEach(windowId => {
      this.destroyWindow(timerId, windowId)
    })
    delete this.timers[timerId]
    this._playbackMessages.delete(timerId)
  }

  configUpdated() {
    Object.keys(this.timers).forEach(timerId => {
      const timersInSettings = this.app.config.settings.timers
      if (Object.keys(timersInSettings).includes(timerId)) {
        Object.keys(this.timers[timerId].windows).forEach(windowId => {
          if (!Object.keys(timersInSettings[timerId].windows).includes(windowId)) {
            this.destroyWindow(timerId, windowId)
          }
        })
      } else {
        this.destroyTimer(timerId)
      }
    })

    Object.keys(this.app.config.settings.timers).forEach(timerId => {
      const timer = this.app.config.settings.timers[timerId];

      if (Object.keys(this.timers).includes(timerId)) {
        const colorThresholds: ColorThreshold[] = Object.values(timer.windows).flatMap(w => w.colors?.thresholds ?? [])
        const options: TimerEngineOptions = {
          stopTimerAtZero: timer.stopTimerAtZero,
          setTimeLive: timer.setTimeLive,
          audioFile: timer.audioFile,
          colorThresholds,
        }

        this.timers[timerId].engine.options = options
        this.timers[timerId].engine.setTimerInterval(timer.timerDuration)
        this.timers[timerId].settings = timer
        // Re-point immediately so changing a timer's source does not wait for the next refresh
        this._applyPlaybackToTimer(timerId)

        Object.keys(timer.windows).forEach(windowId => {
          if (!Object.keys(this.timers[timerId].windows).includes(windowId)) {
            this.timers[timerId].windows[windowId] = this._createWindow(timerId, timer.name, windowId, timer.windows[windowId])
            if (this.app.config.settings.remote.ndiEnabled) {
              const server = new NDIManager(`Countdown ${timer.name}-${windowId}`)
              server.alpha = this.app.config.settings.remote.ndiAlpha
              server.start()
              this.timers[timerId].ndiServers[windowId] = server
            }
            if (this.app.config.settings.remote.omtEnabled) {
              const server = new OMTManager(`Countdown ${timer.name}-${windowId}`)
              server.start()
              this.timers[timerId].omtServers[windowId] = server
            }
          }
        })

        Object.keys(this.timers[timerId].ndiServers).forEach(windowId => {
          this.timers[timerId].ndiServers[windowId].alpha = this.app.config.settings.remote.ndiAlpha
        })

        Object.keys(this.timers[timerId].windows).forEach(windowId => {
          const windowHandler = this.timers[timerId].windows[windowId]
          windowHandler.browserWindow.webContents.send('settings:updated', timer.windows[windowId])
        })
      } else {
        this.createTimer(timerId, timer)
      }
    })

    this._configWebSocketUpdate()
  }

  windowUpdated(timerId: string, windowId: number): void {
    const windowHandler = this.timers[timerId].windows[windowId]
    const windowSettings = this.timers[timerId].settings.windows[windowId];

    this._setCountdownWindowPosition(windowHandler, windowSettings)
  }

  sendOMTFrames() {
    try {
      Object.keys(this.timers).forEach(timerId => {
        const timer = this.timers[timerId];

        Object.keys(timer.omtServers).forEach(async windowId => {
          const windowHandler = this.timers[timerId].windows[windowId]
          const omtServer = timer.omtServers[windowId]
          if (!omtServer.hasConnections()) return
          const image = await windowHandler.browserWindow.webContents.capturePage()
          await timer.omtServers[windowId].sendFrame(image)
        })
      })
    } catch (e) {
      console.log(e);
      return;
    }
  }

  sendNDIFrames() {
    try {
      Object.keys(this.timers).forEach(timerId => {
        const timer = this.timers[timerId];

        Object.keys(timer.ndiServers).forEach(async windowId => {
          const windowHandler = this.timers[timerId].windows[windowId]
          const ndiServer = timer.ndiServers[windowId]
          if (!ndiServer.hasConnections()) return
          const image = await windowHandler.browserWindow.webContents.capturePage()
          await timer.ndiServers[windowId].sendFrame(image)
        })
      })
    } catch (e) {
      console.log(e);
      return;
    }
  }

  startOmt(): void {
    Object.keys(this.timers).forEach(timerId => {
      const timer = this.timers[timerId];
      Object.keys(timer.windows).forEach(windowId => {
        if (timer.omtServers[windowId]) return
        const server = new OMTManager(`Countdown ${timer.settings.name}-${windowId}`)
        server.start()
        timer.omtServers[windowId] = server
      })
    })
  }

  stopOmt(): void {
    Object.keys(this.timers).forEach(timerId => {
      const timer = this.timers[timerId];
      Object.keys(timer.omtServers).forEach(windowId => {
        timer.omtServers[windowId].stop()
        delete timer.omtServers[windowId]
      })
    })
  }

  startNdi(): void {
    Object.keys(this.timers).forEach(timerId => {
      const timer = this.timers[timerId];
      Object.keys(timer.windows).forEach(windowId => {
        if (timer.ndiServers[windowId]) return
        const server = new NDIManager(`Countdown ${timer.settings.name}-${windowId}`)
        server.alpha = this.app.config.settings.remote.ndiAlpha
        server.start()
        timer.ndiServers[windowId] = server
      })
    })
  }

  stopNdi(): void {
    Object.keys(this.timers).forEach(timerId => {
      const timer = this.timers[timerId];
      Object.keys(timer.ndiServers).forEach(windowId => {
        timer.ndiServers[windowId].stop()
        delete timer.ndiServers[windowId]
      })
    })
  }

  setNdiAlpha(alpha: boolean): void {
    Object.keys(this.timers).forEach(timerId => {
      Object.keys(this.timers[timerId].ndiServers).forEach(windowId => {
        this.timers[timerId].ndiServers[windowId].alpha = alpha
      })
    })
  }

  /**
   * Routes a playback provider's state to the timers that follow it. Every other timer is left
   * alone, and a timer that no longer follows this source has its override cleared.
   */
  applyPlaybackState(sourceId: string, state: PlaybackState | null): void {
    if (state === null) {
      this._playbackStates.delete(sourceId)
    } else {
      this._playbackStates.set(sourceId, state)
    }

    Object.keys(this.timers).forEach(timerId => this._applyPlaybackToTimer(timerId))
  }

  private _applyPlaybackToTimer(timerId: string) {
    const timer = this.timers[timerId]
    if (!timer) return

    // Listed highest priority first: the first source playing drives the timer
    const link = (timer.settings.playbackSources ?? []).find(candidate => this._playbackStates.has(candidate.sourceId))
    const state = link ? this._playbackStates.get(link.sourceId) : null
    const sourceName = link ? playbackSourceLabel(link.sourceId, this.app.config.settings.remote?.playback) : null

    timer.engine.setSourceOverride(state ? {
      sourceId: link.sourceId,
      sourceName,
      remainingSeconds: state.remainingSeconds,
      totalSeconds: state.totalSeconds,
      isRunning: state.isRunning,
      title: state.title,
      media: state.media ?? null,
    } : null)

    const rendered = state && link.message
      ? renderMessageTemplate(link.message, playbackTemplateVars(state, sourceName))
      : null
    this._setPlaybackMessage(timerId, rendered)
  }

  private _setPlaybackMessage(timerId: string, rendered: string | null) {
    const engine = this.timers[timerId]?.engine
    if (!engine) return

    let tracker = this._playbackMessages.get(timerId)
    if (!tracker) {
      if (rendered === null) return
      tracker = new PlaybackMessageTracker()
      this._playbackMessages.set(timerId, tracker)
    }

    const message = tracker.update(rendered, engine.message)
    if (message !== undefined) engine.setMessage(message ?? undefined)
  }

  cleanUp(): void {
    this._playbackStates.clear()
    Object.keys(this.timers).forEach(timerId => {
      const timer = this.timers[timerId];
      this._setPlaybackMessage(timerId, null)
      timer.engine.setSourceOverride(null)
      timer.engine.reset()
      Object.keys(timer.ndiServers).forEach(windowId => {
        timer.ndiServers[windowId].stop()
      })
      Object.keys(timer.omtServers).forEach(windowId => {
        timer.omtServers[windowId].stop()
      })
    })
  }
}
