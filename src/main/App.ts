import NDI from "./Remotes/NDI";
import addDefaultEvents from "./Utilities/addDefaultEvents";
import addIpcHandles, {setCountdownWindowPosition} from "./Utilities/addIpcHandles";
import {enableDevMode, isDev} from "./Utilities/dev";
import BrowserWinHandler from "./Utilities/BrowserWinHandler";
import createMainWindow from "./mainWindow";
import setMenu from "./Utilities/setMenu";
import {app, BrowserWindow, screen} from "electron";
import createCountdownWindow from "./countdownWindow";
import Store from "electron-store";
import {
  DEFAULT_NDI_ENABLED, DEFAULT_OSC_ENABLED, DEFAULT_OSC_PORT, DEFAULT_SET_TIME_LIVE,
  DEFAULT_STORE, DEFAULT_TIMER_ALWAYS_ON_TOP, DEFAULT_TIMER_DURATION,
  DEFAULT_WEBSERVER_ENABLED,
  DEFAULT_WEBSERVER_PORT
} from "../common/config";
import HTTP from "./Remotes/HTTP";
import {OSC} from "./Remotes/OSC";
import {TimerEngine} from "./TimerEngine";
import {IpcTimerController} from "./Remotes/IpcTimerController";
import {MessageUpdate, TimerEngineUpdate, TimerEngineWebSocketUpdate} from "../common/TimerInterfaces";
import {applyMigrations} from "./Migrations/applyMigrations";

export class CountdownApp {
  mainWindowHandler: BrowserWinHandler = null
  countdownWindowHandler: BrowserWinHandler = null;
  store = new Store(DEFAULT_STORE);
  timerEngine: TimerEngine;
  ipcTimerController: IpcTimerController;

  ndiServer = new NDI("Countdown");
  ndiTimer: NodeJS.Timer = null;
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
    this.timerEngine = new TimerEngine(
      this.store.get('settings.timerDuration', DEFAULT_TIMER_DURATION),
      this.store.get('settings.setTimeLive', DEFAULT_SET_TIME_LIVE),
      this._timerEngineUpdate.bind(this),
      this._timerEngineWebSocketUpdate.bind(this),
      this._timerEngineMessageUpdate.bind(this),
    );
    this.ipcTimerController = new IpcTimerController(this.timerEngine);
  }

  async run() {
    this.mainWindowHandler = createMainWindow();

    this.mainWindowHandler.onCreated((browserWindow) => {
      setMenu(this.mainWindowHandler, this.timerEngine);

      const screensUpdated = (browserWindow: BrowserWindow) => {
        browserWindow.webContents.send('screens-updated');
      }

      screen.on('display-added', () => screensUpdated(browserWindow))
      screen.on('display-removed', () => screensUpdated(browserWindow))
      screen.on('display-metrics-changed', () => screensUpdated(browserWindow))

      browserWindow.on('closed', () => {
        app.quit();
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
    console.log(update);
  }
}
