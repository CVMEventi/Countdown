import NDI from "./Remotes/NDI";
import addDefaultEvents from "./Utilities/addDefaultEvents";
import addIpcHandles, {setCountdownWindowPosition} from "./Utilities/addIpcHandles";
import {enableDevMode, isDev} from "./Utilities/dev";
import BrowserWinHandler from "./Utilities/BrowserWinHandler";
import createMainWindow from "./mainWindow";
import setMenu from "./Utilities/setMenu";
import {app, BrowserWindow, ipcMain, screen} from "electron";
import createCountdownWindow from "./countdownWindow";
import Store from "electron-store";
import {
  CountdownConfiguration, DEFAULT_NDI_ENABLED, DEFAULT_OSC_ENABLED, DEFAULT_OSC_PORT,
  DEFAULT_STORE, DEFAULT_TIMER_ALWAYS_ON_TOP,
  DEFAULT_WEBSERVER_ENABLED,
  DEFAULT_WEBSERVER_PORT
} from "../common/config";
import {sleep} from "./Utilities/utilities";
import HTTP from "./Remotes/HTTP";
import {OSC} from "./Remotes/OSC";
import {TimerEngine} from "./TimerEngine";
import {IpcTimerController} from "./Remotes/IpcTimerController";
import {TimerEngineUpdate, TimerEngineWebSocketUpdate} from "../common/TimerInterfaces";

export class CountdownApp {
  mainWindowHandler: BrowserWinHandler = null
  countdownWindowHandler: BrowserWinHandler = null;
  store = new Store(DEFAULT_STORE);
  timerEngine: TimerEngine;
  ipcTimerController: IpcTimerController;

  ndiServer = new NDI("Countdown");
  webServer: HTTP = null;
  oscServer: OSC = null;

  constructor() {
    addDefaultEvents();
    addIpcHandles(this);
    if (isDev) {
      enableDevMode();
    }
    this.timerEngine = new TimerEngine(
      this._timerEngineUpdate.bind(this),
      this._timerEngineWebSocketUpdate.bind(this)
    );
    this.ipcTimerController = new IpcTimerController(this.timerEngine);
  }

  async run() {
    if (this.store.get('settings.ndiEnabled', DEFAULT_NDI_ENABLED)) {
      await this.ndiServer.start();
    }

    this.mainWindowHandler = createMainWindow();

    this.mainWindowHandler.onCreated((browserWindow) => {
      setMenu(this.mainWindowHandler);

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

    this.countdownWindowHandler.onCreated(async function (browserWindow) {
      browserWindow.on('closed', () => {
        app.quit();
      })

      await setCountdownWindowPosition(this);
    })

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

    setInterval(async () => {
      try {
        const browserWindow = this.countdownWindowHandler.browserWindow
        const image = await browserWindow.webContents.capturePage()
        await this.ndiServer.sendFrame(image);
      } catch (e) {
        console.log(e);
        return;
      }
    }, 100)
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
}
