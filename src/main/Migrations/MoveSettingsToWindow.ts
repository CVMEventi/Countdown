import {BaseMigration} from "./BaseMigration";
import {CloseAction, CountdownStore} from "../../common/config";

export class MoveSettingsToWindow implements BaseMigration {
  migrate(oldConfig: { [key: string]: unknown }): { [key: string]: unknown } {
    const settings = oldConfig.settings as {[key: string]: unknown};

    if (oldConfig.version as number >= 2) return oldConfig

    const newConfig: CountdownStore = {
      version: 2,
      settings: {
        presets: settings.presets as any,
        remote: {
          webServerEnabled: settings.webServerEnabled as any,
          webServerPort: settings.webServerPort as any,
          ndiEnabled: settings.ndiEnabled as any,
          ndiAlpha: settings.ndiAlpha as any,
          oscEnabled: settings.oscEnabled as any,
          oscPort: settings.oscPort as any,
        },
        setWindowAlwaysOnTop: settings.setWindowAlwaysOnTop as any,
        closeAction: settings.closeAction as any ?? CloseAction.Ask,
        startHidden: settings.startHidden as any ?? false,
        timers: [{
          yellowAtOption: settings.yellowAtOption as any,
          yellowAtMinutes: settings.yellowAtMinutes as any,
          yellowAtPercent: settings.yellowAtPercent as any,
          timerDuration: settings.timerDuration as any,
          setTimeLive: settings.setTimeLive as any,
          stopTimerAtZero: settings.stopTimerAtZero as any,
          windows: [{
            alwaysOnTop: settings.timerAlwaysOnTop as any,
            bounds: oldConfig.window as any,
            show: {
              ...(settings.show as any),
              hours: settings.showHours as any,
            },
            messageBoxFixedHeight: settings.messageBoxFixedHeight as any,
            contentAtReset: settings.contentAtReset as any,
            colors: {
              background: settings.backgroundColor as any,
              resetBackground: settings.resetBackgroundColor as any,
              text: settings.textColor as any,
              timerFinishedText: settings.timerFinishedTextColor as any,
              clock: settings.clockColor as any,
              clockText: settings.clockTextColor as any,
            },
            pulseAtZero: settings.pulseAtZero as any,
            use12HourClock: settings.use12HourClock as any,
          }]
        }]
      }
    }

    return newConfig as any;
  }

}
