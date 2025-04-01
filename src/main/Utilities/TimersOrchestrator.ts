import {
  TimerSettings,
  WindowBounds,
  WindowSettings
} from "../../common/config.ts";
import {TimerEngine, TimerEngineOptions} from "../TimerEngine.ts";
import BrowserWinHandler from "./BrowserWinHandler.ts";
import createCountdownWindow from "../countdownWindow.ts";
import {BrowserWindow, screen} from "electron";
import {MessageUpdate, TimerEngineUpdate, TimerEngineWebSocketUpdate} from "../../common/TimerInterfaces.ts";
import {CountdownApp} from "../App.ts";
import {sleep} from "./utilities.ts";
import {promises as fs} from "node:fs";
// @ts-ignore
import mime from "mime/lite";
import NDIManager from "../Remotes/NDI.ts";

interface WindowsKV {
  [key: string]: BrowserWinHandler;
}

interface NDIManagersKV {
  [key: string]: NDIManager;
}

interface SingleTimer {
  settings: TimerSettings
  engine: TimerEngine
  windows: WindowsKV
  ndiServers: NDIManagersKV
}

interface TimersKV {
  [key: string]: SingleTimer
}

export class TimersOrchestrator {
  app: CountdownApp
  timers: TimersKV = {}
  currentTimer: string|null = null

  constructor(app: CountdownApp) {
    this.app = app
    Object.keys(app.config.settings.timers).forEach(timerId => {
      this.createTimer(timerId, app.config.settings.timers[timerId]);
    })
  }

  public createTimer(timerId: string, settings: TimerSettings) {
    const options: TimerEngineOptions = {
      yellowAtOption: settings.yellowAtOption,
      yellowAt: settings.yellowAtOption === 'minutes' ? settings.yellowAtMinutes : settings.yellowAtPercent,
      stopTimerAtZero: settings.stopTimerAtZero,
      setTimeLive: settings.setTimeLive,
      audioFile: settings.audioFile,
    }

    const timerEngine = new TimerEngine(
      settings.timerDuration,
      options,
      (update: TimerEngineUpdate) => {
        this._timerEngineUpdate(timerId, update)
      },
      (update: TimerEngineWebSocketUpdate) => {
        this._timerEngineWebSocketUpdate(timerId, {
          timerId,
          ...update
        })
      },
      (update: MessageUpdate) => {
        this._timerEngineMessageUpdate(timerId, {
          ...update,
          timerId,
        })
      },
      async (audioFilePath) => {
        await this._playSound(timerId, audioFilePath)
      }
    )

    let windows: WindowsKV = {}
    Object.keys(settings.windows).forEach(windowId => {
      const windowSettings = settings.windows[windowId]
      windows[windowId] = this._createWindow(timerId, settings.name, windowId, windowSettings)
    })

    let ndiServers: NDIManagersKV = {}
    Object.keys(settings.windows).forEach(windowId => {
      const server = new NDIManager(`Countdown ${settings.name}-${windowId}`)
      server.start()
      ndiServers[windowId] = server
    })

    this.timers[timerId] = {
      settings,
      engine: timerEngine,
      windows,
      ndiServers,
    }
  }

  private _createWindow(timerId: string, timerName: string, windowId: string, windowSettings: WindowSettings) {
    const countdownWindowHandler = createCountdownWindow(timerId, timerName, windowId, {
      x: windowSettings.bounds.x,
      y: windowSettings.bounds.y,
      height: windowSettings.bounds.height,
      width: windowSettings.bounds.width,
      // fullscreen: true
      frame: false,
      enableLargerThanScreen: true,
      transparent: true,
      alwaysOnTop: windowSettings.bounds.alwaysOnTop,
    });

    countdownWindowHandler.onCreated(async function (browserWindow: BrowserWindow) {
      await this._setCountdownWindowPosition(countdownWindowHandler, windowSettings);
    }.bind(this))

    return countdownWindowHandler
  }

  async _playSound(timerId: string, audioFilePath: string) {
    const mainBrowserWindow = this.app.mainWindowHandler.browserWindow;
    let audioFile;
    try {
      audioFile = await fs.readFile(audioFilePath, {encoding: 'base64'})
    } catch {
      return
    }
    const mimeType = mime.getType(audioFilePath)

    mainBrowserWindow.webContents.send('audio:play', audioFile, mimeType)
  }

  _timerEngineUpdate(timerId: string, update: TimerEngineUpdate) {
    const mainBrowserWindow = this.app.mainWindowHandler.browserWindow;
    mainBrowserWindow.webContents.send('update', timerId, update);
    Object.keys(this.timers[timerId].windows).forEach(windowId => {
      const browserWinHandler = this.timers[timerId].windows[windowId];
      browserWinHandler.browserWindow.webContents.send('update', update);
    })
  }

  _timerEngineWebSocketUpdate(timerId: string, update: TimerEngineWebSocketUpdate) {
    this.app.webServer.sendToWebSocket({
      type: 'timerEngine',
      update
    })
  }

  _timerEngineMessageUpdate(timerId: string, update: MessageUpdate) {
    Object.keys(this.timers[timerId].windows).forEach(windowId => {
      const browserWinHandler = this.timers[timerId].windows[windowId];
      browserWinHandler.browserWindow.webContents.send('message', update);
    })
  }

  async _setCountdownWindowPosition(countdownWindowHandler: BrowserWinHandler, windowSettings: WindowSettings) {
    const browserWindow = countdownWindowHandler.browserWindow
    const fullscreenOn = windowSettings.bounds.fullscreenOn
    const selectedScreen = screen.getAllDisplays().find((display) => display.id === fullscreenOn)

    if (browserWindow.fullScreen && fullscreenOn === null) {
      browserWindow.setFullScreen(false)
      await new Promise(r => setTimeout(r, 1000));
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
  }

  destroyWindow(timerId: string, windowId: string) {
    this.timers[timerId].windows[windowId].browserWindow.destroy()
    delete this.timers[timerId].windows[windowId]
  }

  destroyTimer(timerId: string) {
    Object.keys(this.timers[timerId].windows).forEach(windowId => {
      this.destroyWindow(timerId, windowId)
    })
    delete this.timers[timerId]
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
        const options: TimerEngineOptions = {
          yellowAtOption: timer.yellowAtOption,
          yellowAt: timer.yellowAtOption === 'minutes' ? timer.yellowAtMinutes : timer.yellowAtPercent,
          stopTimerAtZero: timer.stopTimerAtZero,
          setTimeLive: timer.setTimeLive,
          audioFile: timer.audioFile,
        }

        this.timers[timerId].engine.options = options
        this.timers[timerId].engine.setTimerInterval(timer.timerDuration)
        this.timers[timerId].settings = timer

        Object.keys(timer.windows).forEach(windowId => {
          if (!Object.keys(this.timers[timerId].windows).includes(windowId)) {
            this.timers[timerId].windows[windowId] = this._createWindow(timerId, timer.name, windowId, timer.windows[windowId])
          }
        })

        Object.keys(this.timers[timerId].windows).forEach(windowId => {
          const windowHandler = this.timers[timerId].windows[windowId]
          windowHandler.browserWindow.webContents.send('settings:updated', timer.windows[windowId])
        })
      } else {
        this.createTimer(timerId, timer)
      }
    })
  }

  windowUpdated(timerId: string, windowId: number): void {
    const windowHandler = this.timers[timerId].windows[windowId]
    const windowSettings = this.timers[timerId].settings.windows[windowId];

    this._setCountdownWindowPosition(windowHandler, windowSettings)
  }

  getWindowBounds(timerId: string, windowId: string): WindowBounds {
    const windowHandler = this.timers[timerId].windows[windowId]
    const windowBounds = windowHandler.browserWindow.getBounds()
    const windowSettings = this.timers[timerId].settings.windows[windowId]

    return {
      alwaysOnTop: windowSettings.bounds.alwaysOnTop,
      width: windowBounds.width,
      height: windowBounds.height,
      x: windowBounds.x,
      y: windowBounds.y,
      fullscreenOn: windowSettings.bounds.fullscreenOn
    }
  }

  sendNDIFrames() {
    try {
      Object.keys(this.timers).forEach(timerId => {
        const timer = this.timers[timerId];

        Object.keys(timer.windows).forEach(async windowId => {
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
}
