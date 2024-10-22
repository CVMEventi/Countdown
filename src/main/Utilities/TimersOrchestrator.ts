import {
  TimerSettings,
  WindowBounds,
  WindowSettings
} from "../../common/config.ts";
import {TimerEngine, TimerEngineOptions} from "../TimerEngine.ts";
import BrowserWinHandler from "./BrowserWinHandler.ts";
import createCountdownWindow from "../countdownWindow.ts";
import {app, BrowserWindow, ipcMain, screen} from "electron";
import {MessageUpdate, TimerEngineUpdate, TimerEngineWebSocketUpdate} from "../../common/TimerInterfaces.ts";
import {CountdownApp} from "../App.ts";
import {sleep} from "./utilities.ts";
import {promises as fs} from "node:fs";
import mime from "mime/lite";
import path from "path";

interface SingleTimer {
  settings: TimerSettings
  engine: TimerEngine
  windows: BrowserWinHandler[]
}

export class TimersOrchestrator {
  app: CountdownApp
  timers: SingleTimer[] = []

  constructor(app: CountdownApp) {
    this.app = app
    app.config.settings.timers.forEach((timer: TimerSettings, timerId: number) => {
      const options: TimerEngineOptions = {
        yellowAtOption: timer.yellowAtOption,
        yellowAt: timer.yellowAtOption === 'minutes' ? timer.yellowAtMinutes : timer.yellowAtPercent,
        stopTimerAtZero: timer.stopTimerAtZero,
        setTimeLive: timer.setTimeLive,
        audioFile: timer.audioFile,
      }

      const timerEngine = new TimerEngine(
        timer.timerDuration,
        options,
        (update: TimerEngineUpdate) => {
          this._timerEngineUpdate(timerId, update)
        },
        (update: TimerEngineWebSocketUpdate) => {
          this._timerEngineWebSocketUpdate(timerId, update)
        },
        (update: MessageUpdate) => {
          this._timerEngineMessageUpdate(timerId, update)
        },
        async (audioFilePath) => {
          await this._playSound(timerId, audioFilePath)
        }
      )

      const windows = timer.windows.map((windowSettings, windowId) => {
        return this._createWindow(timerId, windowId, windowSettings)
      })

      this.timers.push({
        settings: timer,
        engine: timerEngine,
        windows,
      })
    })
  }

  private _createWindow(timerId: number, windowId: number, windowSettings: WindowSettings) {
    const countdownWindowHandler = createCountdownWindow(timerId, windowId, {
      x: windowSettings.bounds.x,
      y: windowSettings.bounds.y,
      height: windowSettings.bounds.height,
      width: windowSettings.bounds.width,
      // fullscreen: true
      frame: false,
      enableLargerThanScreen: true,
      transparent: true,
      alwaysOnTop: windowSettings.alwaysOnTop,
    });

    countdownWindowHandler.onCreated(async function (browserWindow: BrowserWindow) {
      browserWindow.on('closed', () => {
        app.quit();
      })

      await this._setCountdownWindowPosition(countdownWindowHandler, windowSettings);
    }.bind(this))

    return countdownWindowHandler
  }

  async _playSound(timerId: number, audioFilePath: string) {
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

  _timerEngineUpdate(timerId: number, update: TimerEngineUpdate) {
    const mainBrowserWindow = this.app.mainWindowHandler.browserWindow;
    mainBrowserWindow.webContents.send('update', update);
    this.timers[timerId].windows.forEach((browserWinHandler) => {
      browserWinHandler.browserWindow.webContents.send('update', update);
    })
  }

  _timerEngineWebSocketUpdate(timerId: number, update: TimerEngineWebSocketUpdate) {
    this.app.webServer.sendToWebSocket(update)
  }

  _timerEngineMessageUpdate(timerId: number, update: MessageUpdate) {
    this.timers[timerId].windows.forEach((browserWinHandler) => {
      browserWinHandler.browserWindow.webContents.send('message', update);
    })
  }

  async _setCountdownWindowPosition(countdownWindowHandler: BrowserWinHandler, windowSettings: WindowSettings) {
    const browserWindow = countdownWindowHandler.browserWindow
    const fullscreenOn = windowSettings.bounds.fullscreenOn
    const selectedScreen = screen.getAllDisplays().find((display) => display.id === fullscreenOn)

    if (browserWindow.fullScreen) {
      browserWindow.setFullScreen(false)
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
  }

  configUpdated() {
    this.app.config.settings.timers.forEach((timer: TimerSettings, timerId: number) => {
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

      this.timers[timerId].windows.forEach((windowHandler) => {
        windowHandler.browserWindow.webContents.send('settings:updated', timer.windows[timerId])
      })
    })
  }

  windowUpdated(timerId: number, windowId: number): void {
    const windowHandler = this.timers[timerId].windows[windowId]
    const windowSettings = this.timers[timerId].settings.windows[windowId];

    this._setCountdownWindowPosition(windowHandler, windowSettings)
  }

  getWindowBounds(timerId: number, windowId: number): WindowBounds {
    const windowHandler = this.timers[timerId].windows[windowId]
    const windowBounds = windowHandler.browserWindow.getBounds()
    const windowSettings = this.timers[timerId].settings.windows[windowId]

    return {
      width: windowBounds.width,
      height: windowBounds.height,
      x: windowBounds.x,
      y: windowBounds.y,
      fullscreenOn: windowSettings.bounds.fullscreenOn
    }
  }
}
