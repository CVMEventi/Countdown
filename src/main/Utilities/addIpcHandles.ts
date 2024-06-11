import {ipcMain, screen} from "electron";
import {CountdownApp} from "../App";
import {sleep} from "./utilities";
import {
  DEFAULT_NDI_ALPHA,
  DEFAULT_NDI_ENABLED, DEFAULT_OSC_ENABLED, DEFAULT_OSC_PORT, DEFAULT_SET_TIME_LIVE, DEFAULT_STOP_TIMER_AT_ZERO,
  DEFAULT_TIMER_ALWAYS_ON_TOP, DEFAULT_TIMER_DURATION,
  DEFAULT_WINDOW_BOUNDS, DEFAULT_YELLOW_AT_MINUTES, DEFAULT_YELLOW_AT_OPTION, DEFAULT_YELLOW_AT_PERCENT
} from "../../common/config";

export async function setCountdownWindowPosition(app: CountdownApp) {
  const browserWindow = app.countdownWindowHandler.browserWindow
  const fullscreenOn = app.store.get('window.fullscreenOn', null)
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
    x: app.store.get('window.x', DEFAULT_WINDOW_BOUNDS.x),
    y: app.store.get('window.y', DEFAULT_WINDOW_BOUNDS.y),
    height: app.store.get('window.height', DEFAULT_WINDOW_BOUNDS.height),
    width: app.store.get('window.width', DEFAULT_WINDOW_BOUNDS.width)
  })
}

export default function addIpcHandles(app: CountdownApp)
{
  ipcMain.handle('get-screens', () => {
    return screen.getAllDisplays()
  })

  ipcMain.on('window-updated', async () => {
    await setCountdownWindowPosition(app)
  })

  ipcMain.on('temporary-settings-updated', (event, arg) => {
    const browserWindow = app.countdownWindowHandler.browserWindow
    browserWindow.webContents.send('temporary-settings-updated', arg)
  })

  ipcMain.on('settings-updated', () => {
    const browserWindow = app.countdownWindowHandler.browserWindow
    browserWindow.webContents.send('settings-updated')

    browserWindow.setAlwaysOnTop(app.store.get('settings.timerAlwaysOnTop', DEFAULT_TIMER_ALWAYS_ON_TOP))

    if (app.store.get('settings.ndiEnabled', DEFAULT_NDI_ENABLED)) {
      app.ndiServer.start();
      app.startNdiTimer();
    } else {
      app.ndiServer.stop()
      app.stopNdiTimer();
    }
    if (app.store.get('settings.oscEnabled', DEFAULT_OSC_ENABLED)) {
      app.oscServer.port = app.store.get('settings.oscPort', DEFAULT_OSC_PORT);
      app.oscServer.start();
    } else {
      app.oscServer.stop();
    }
    app.ndiServer.alpha = app.store.get('settings.ndiAlpha', DEFAULT_NDI_ALPHA);

    app.timerEngine.setTimerInterval(app.store.get('settings.timerDuration', DEFAULT_TIMER_DURATION));


    let yellowAt: number
    const yellowAtOption = app.store.get('settings.yellowAtOption', DEFAULT_YELLOW_AT_OPTION)
    if (yellowAtOption === 'minutes') {
      yellowAt = app.store.get('settings.yellowAtMinutes', DEFAULT_YELLOW_AT_MINUTES)
    } else {
      yellowAt = app.store.get('settings.yellowAtPercent', DEFAULT_YELLOW_AT_PERCENT)
    }

    app.timerEngine.options = {
      ...app.timerEngine.options,
      ...{
        yellowAt,
        yellowAtOption,
        setTimeLive: app.store.get('settings.setTimeLive', DEFAULT_SET_TIME_LIVE),
        stopTimerAtZero: app.store.get('settings.stopTimerAtZero', DEFAULT_STOP_TIMER_AT_ZERO),
      }
    }
  })

  ipcMain.on('send-to-countdown-window', (event, arg) => {
    const browserWindow = app.countdownWindowHandler.browserWindow
    browserWindow.webContents.send('command', arg)
  })

  ipcMain.handle('countdown-bounds', () => {
    const browserWindow = app.countdownWindowHandler.browserWindow;
    return browserWindow.getBounds();
  })
}
