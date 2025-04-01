// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import {BaseMigration} from "./BaseMigration.ts";
import {CloseAction, DEFAULT_TIMER_NAME} from '../../common/config.ts'
import {ulid} from 'ulid'

export class MoveSettingsToWindow implements BaseMigration {
  migrate(oldConfig: { [key: string]: unknown }): { [key: string]: unknown } {
    const settings = oldConfig.settings as {[key: string]: unknown};

    if (oldConfig.version as number >= 2 && oldConfig.settings.timers) return oldConfig

    return {
      version: 2,
      settings: {
        presets: settings.presets,
        remote: {
          webServerEnabled: settings.webServerEnabled,
          webServerPort: settings.webServerPort,
          ndiEnabled: settings.ndiEnabled,
          ndiAlpha: settings.ndiAlpha,
          oscEnabled: settings.oscEnabled,
          oscPort: settings.oscPort,
        },
        setWindowAlwaysOnTop: settings.setWindowAlwaysOnTop,
        closeAction: settings.closeAction ?? CloseAction.Ask,
        startHidden: settings.startHidden ?? false,
        timers: {
          [ulid()]: {
            name: DEFAULT_TIMER_NAME,
            yellowAtOption: settings.yellowAtOption,
            yellowAtMinutes: settings.yellowAtMinutes,
            yellowAtPercent: settings.yellowAtPercent,
            timerDuration: settings.timerDuration,
            setTimeLive: settings.setTimeLive,
            stopTimerAtZero: settings.stopTimerAtZero,
            windows: {
              [ulid()]: {
                bounds: {
                  ...oldConfig.window,
                  alwaysOnTop: settings.timerAlwaysOnTop,
                },
                show: {
                  ...(settings.show),
                  hours: settings.showHours,
                },
                messageBoxFixedHeight: settings.messageBoxFixedHeight,
                contentAtReset: settings.contentAtReset,
                colors: {
                  background: settings.backgroundColor,
                  resetBackground: settings.resetBackgroundColor,
                  text: settings.textColor,
                  timerFinishedText: settings.timerFinishedTextColor,
                  clock: settings.clockColor,
                  clockText: settings.clockTextColor,
                },
                pulseAtZero: settings.pulseAtZero,
                use12HourClock: settings.use12HourClock,
              }
            }
          }
        }
      }
    };
  }

}
