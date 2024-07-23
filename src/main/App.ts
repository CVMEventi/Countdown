import NDI from "./Remotes/NDI";
import addDefaultEvents from "./Utilities/addDefaultEvents";
import addIpcHandles from "./Utilities/addIpcHandles";
import {enableDevMode, isDev} from "./Utilities/dev";
import BrowserWinHandler from "./Utilities/BrowserWinHandler";
import createMainWindow from "./mainWindow";
import setMenu from "./Utilities/setMenu";
import {app, BrowserWindow, screen, Tray, Menu, nativeImage, dialog} from "electron";
import {
  CloseAction,
  DEFAULT_CLOSE_ACTION,
  DEFAULT_NDI_ENABLED,
  DEFAULT_OSC_ENABLED,
  DEFAULT_OSC_PORT,
  DEFAULT_START_HIDDEN,
  DEFAULT_STORE,
  DEFAULT_WEBSERVER_ENABLED,
  DEFAULT_WEBSERVER_PORT,
} from "../common/config";
import HTTP from "./Remotes/HTTP";
import {OSC} from "./Remotes/OSC";
import {IpcTimerController} from "./Remotes/IpcTimerController";
import {applyMigrations} from "./Migrations/applyMigrations";
import macosTrayIcon from "../icons/tray/TrayTemplate.png"
import macOsTrayIcon2x from "../icons/tray/TrayTemplate@2x.png"
import otherOsTrayIcon from "../icons/icon.ico"
import path from "path";
import * as process from "node:process";
import {Config} from "./Utilities/Config";
import {TimersOrchestrator} from "./Utilities/TimersOrchestrator";

// To be packaged, otherwise it doesn't work
console.log(macOsTrayIcon2x)

export class CountdownApp {
  mainWindowHandler: BrowserWinHandler = null
  countdownWindowHandler: BrowserWinHandler = null
  ipcTimerController: IpcTimerController;
  config: Config = new Config(this._configUpdated.bind(this));
  timersOrchestrator: TimersOrchestrator

  ndiServer = new NDI("Countdown");
  ndiTimer: NodeJS.Timeout = null;
  webServer: HTTP = null;
  oscServer: OSC = null;

  constructor() {
    addDefaultEvents();
    addIpcHandles(this);
    if (isDev) {
      enableDevMode();
    }

    this.timersOrchestrator = new TimersOrchestrator(this)
    this.ipcTimerController = new IpcTimerController(this.timersOrchestrator);
  }

  async run() {
    this.mainWindowHandler = createMainWindow({
      show: !this.config.settings.startHidden
    });

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

      setMenu(this.mainWindowHandler, this.timersOrchestrator);

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

        switch (this.config.settings.closeAction ?? DEFAULT_CLOSE_ACTION) {
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
                  this.config.set('closeAction', CloseAction.Hide)
                }
                browserWindow.hide()
                break;
              case 2:
                if (result.checkboxChecked) {
                  this.config.set('closeAction', CloseAction.Close)
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

    const webServerEnabled = this.config.settings.remote.webServerEnabled ?? DEFAULT_WEBSERVER_ENABLED
    const port = this.config.settings.remote.webServerPort ?? DEFAULT_WEBSERVER_PORT

    this.mainWindowHandler.onCreated((browserWindow) => {
      this.webServer = new HTTP(this.timersOrchestrator, browserWindow);
      this.webServer.port = port;

      if (webServerEnabled) {
        this.webServer.start();
      }

      const oscEnabled = this.config.settings.remote.oscEnabled ?? DEFAULT_OSC_ENABLED
      const oscPort = this.config.settings.remote.oscPort ?? DEFAULT_OSC_PORT
      this.oscServer = new OSC(oscPort, this.timersOrchestrator);
      if (oscEnabled) {
        this.oscServer.start();
      }
    })

    if (this.config.settings.remote.ndiEnabled ?? DEFAULT_NDI_ENABLED) {
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
      if (!this.timersOrchestrator.timers[0].windows[0].browserWindow) return;
      const browserWindow = this.timersOrchestrator.timers[0].windows[0].browserWindow
      const image = await browserWindow.webContents.capturePage()
      await this.ndiServer.sendFrame(image);
    } catch (e) {
      console.log(e);
      return;
    }
  }

  _configUpdated() {
    this.timersOrchestrator.configUpdated()
  }
}
