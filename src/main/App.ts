import NDI from "./Remotes/NDI";
import addDefaultEvents from "./Utilities/addDefaultEvents";
import addIpcHandles, {setCountdownWindowPosition} from "./Utilities/addIpcHandles";
import {enableDevMode, isDev} from "./Utilities/dev";
import BrowserWinHandler from "./Utilities/BrowserWinHandler";
import createMainWindow from "./mainWindow";
import setMenu from "./Utilities/setMenu";
import {app, BrowserWindow, screen, Tray, Menu, nativeImage, dialog} from "electron";
import createCountdownWindow from "./countdownWindow";
import Store from "electron-store";
import {
  CloseAction,
  DEFAULT_CLOSE_ACTION,
  DEFAULT_NDI_ENABLED, DEFAULT_OSC_ENABLED, DEFAULT_OSC_PORT, DEFAULT_SET_TIME_LIVE, DEFAULT_STOP_TIMER_AT_ZERO,
  DEFAULT_STORE, DEFAULT_TIMER_ALWAYS_ON_TOP, DEFAULT_TIMER_DURATION,
  DEFAULT_WEBSERVER_ENABLED,
  DEFAULT_WEBSERVER_PORT, DEFAULT_YELLOW_AT_MINUTES, DEFAULT_YELLOW_AT_OPTION, DEFAULT_YELLOW_AT_PERCENT
} from "../common/config";
import HTTP from "./Remotes/HTTP";
import {OSC} from "./Remotes/OSC";
import {TimerEngine} from "./TimerEngine";
import {IpcTimerController} from "./Remotes/IpcTimerController";
import {MessageUpdate, TimerEngineUpdate, TimerEngineWebSocketUpdate} from "../common/TimerInterfaces";
import {applyMigrations} from "./Migrations/applyMigrations";
import macosTrayIcon from "../icons/tray/TrayTemplate.png"
import macOsTrayIcon2x from "../icons/tray/TrayTemplate@2x.png"
import otherOsTrayIcon from "../icons/icon.ico"
import path from "path";
import * as process from "node:process";

// To be packaged, otherwise it doesn't work
console.log(macOsTrayIcon2x)

export class CountdownApp {
  mainWindowHandler: BrowserWinHandler = null
  countdownWindowHandler: BrowserWinHandler = null;
  store = new Store(DEFAULT_STORE);
  timerEngine: TimerEngine;
  ipcTimerController: IpcTimerController;

  ndiServer = new NDI("Countdown");
  ndiTimer: NodeJS.Timeout = null;
  webServer: HTTP = null;
  oscServer: OSC = null;

  constructor() {
    const newConfig = applyMigrations(this.store.get(null));
    this.store.set(newConfig);

    addDefaultEvents();
    addIpcHandles(this);
    if (isDev) {
      enableDevMode();
    }

    let yellowAt: number
    const yellowAtOption = this.store.get('settings.yellowAtOption', DEFAULT_YELLOW_AT_OPTION)
    if (yellowAtOption === 'minutes') {
      yellowAt = this.store.get('settings.yellowAtMinutes', DEFAULT_YELLOW_AT_MINUTES)
    } else {
      yellowAt = this.store.get('settings.yellowAtPercent', DEFAULT_YELLOW_AT_PERCENT)
    }

    this.timerEngine = new TimerEngine(
      this.store.get('settings.timerDuration', DEFAULT_TIMER_DURATION),
      {
        yellowAt,
        yellowAtOption,
        setTimeLive: this.store.get('settings.setTimeLive', DEFAULT_SET_TIME_LIVE),
        stopTimerAtZero: this.store.get('settings.stopTimerAtZero', DEFAULT_STOP_TIMER_AT_ZERO),
      },
      this._timerEngineUpdate.bind(this),
      this._timerEngineWebSocketUpdate.bind(this),
      this._timerEngineMessageUpdate.bind(this),
    );
    this.ipcTimerController = new IpcTimerController(this.timerEngine);
  }

  async run() {
    this.mainWindowHandler = createMainWindow();

    this.mainWindowHandler.onCreated((browserWindow) => {

      let appIcon: Tray
      if (process.platform === 'darwin') {
        const image = nativeImage.createFromPath(path.resolve(
          __dirname,
          macosTrayIcon,
        ));
        // Marks the image as a template image.
        image.setTemplateImage(true);

        appIcon = new Tray(image)
      } else {
        appIcon = new Tray(path.resolve(
          __dirname,
          otherOsTrayIcon,
        ))
      }

      appIcon.on('right-click', (event, bounds) => {
        const contextMenu = Menu.buildFromTemplate([
          {label: 'Show Settings'},
          {label: 'Quit', role: 'quit'}
        ])

        appIcon.popUpContextMenu(contextMenu);
      })
      appIcon.on('click', (event, bounds) => {
        if (!this.mainWindowHandler.browserWindow.isVisible()) {
          this.mainWindowHandler.browserWindow.show()
        } else {
          this.mainWindowHandler.browserWindow.focus()
        }
      })

      setMenu(this.mainWindowHandler, this.timerEngine);

      const screensUpdated = (browserWindow: BrowserWindow) => {
        browserWindow.webContents.send('screens-updated');
      }

      screen.on('display-added', () => screensUpdated(browserWindow))
      screen.on('display-removed', () => screensUpdated(browserWindow))
      screen.on('display-metrics-changed', () => screensUpdated(browserWindow))

      app.on('before-quit', () => {
        browserWindow.destroy()
      })

      browserWindow.on('close', async (event) => {
        event.preventDefault()

        const closeAction = this.store.get('settings.closeAction', DEFAULT_CLOSE_ACTION)

        switch (closeAction) {
          case CloseAction.Ask:
            const result = await dialog.showMessageBox({
              message: "Choose an action",
              checkboxLabel: "Don't ask again",
              buttons: [
                "Cancel",
                "Hide",
                "Quit"
              ]
            })

            switch (result.response) {
              case 1:
                if (result.checkboxChecked) {
                  this.store.set('settings.closeAction', CloseAction.Hide)
                }
                browserWindow.hide()
                break;
              case 2:
                if (result.checkboxChecked) {
                  this.store.set('settings.closeAction', CloseAction.Close)
                }
                app.quit()
                break;
            }
            break;
          case CloseAction.Hide:
            browserWindow.hide()
            break;
          case CloseAction.Close:
            app.quit()
            break;
        }
      })
    })

    this.countdownWindowHandler = createCountdownWindow({
      x: this.store.get('window.x') ?? 100,
      y: this.store.get('window.y') ?? 100,
      height: this.store.get('window.height') ?? 720,
      width: this.store.get('window.width') ?? 1280,
      // fullscreen: true
      frame: false,
      enableLargerThanScreen: true,
      transparent: true,
      alwaysOnTop: this.store.get('settings.timerAlwaysOnTop', DEFAULT_TIMER_ALWAYS_ON_TOP),
    });

    this.countdownWindowHandler.onCreated(async function (browserWindow: BrowserWindow) {
      browserWindow.on('closed', () => {
        app.quit();
      })

      await setCountdownWindowPosition(this);
    }.bind(this))

    const webServerEnabled = this.store.get('settings.webServerEnabled', DEFAULT_WEBSERVER_ENABLED)
    const port = this.store.get('settings.webServerPort', DEFAULT_WEBSERVER_PORT)

    this.mainWindowHandler.onCreated((browserWindow) => {
      this.webServer = new HTTP(this.timerEngine, browserWindow);
      this.webServer.port = port;

      if (webServerEnabled) {
        this.webServer.start();
      }

      const oscEnabled = this.store.get('settings.oscEnabled', DEFAULT_OSC_ENABLED);
      const oscPort = this.store.get('settings.oscPort', DEFAULT_OSC_PORT);
      this.oscServer = new OSC(oscPort, this.timerEngine);
      if (oscEnabled) {
        this.oscServer.start();
      }
    })

    if (this.store.get('settings.ndiEnabled', DEFAULT_NDI_ENABLED)) {
      await this.ndiServer.start();
      this.startNdiTimer();
    }
  }

  startNdiTimer() {
    if (this.ndiTimer) return;
    this.ndiTimer = setInterval(this.ndiIntervalCallback.bind(this), 100);
  }

  stopNdiTimer() {
    if (!this.ndiTimer) return;
    clearInterval(this.ndiTimer);
    this.ndiTimer = null;
  }

  async ndiIntervalCallback() {
    try {
      if (!this.countdownWindowHandler) return;
      const browserWindow = this.countdownWindowHandler.browserWindow
      const image = await browserWindow.webContents.capturePage()
      await this.ndiServer.sendFrame(image);
    } catch (e) {
      console.log(e);
      return;
    }
  }

  _timerEngineUpdate(update: TimerEngineUpdate) {
    const mainBrowserWindow = this.mainWindowHandler.browserWindow;
    const countdownBrowserWindow = this.countdownWindowHandler.browserWindow;
    mainBrowserWindow.webContents.send('update', update);
    countdownBrowserWindow.webContents.send('update', update);
  }

  _timerEngineWebSocketUpdate(update: TimerEngineWebSocketUpdate) {
    this.webServer.sendToWebSocket(update);
  }

  _timerEngineMessageUpdate(update: MessageUpdate) {
    const countdownWindow = this.countdownWindowHandler.browserWindow;
    countdownWindow.webContents.send('message', update);
  }
}
