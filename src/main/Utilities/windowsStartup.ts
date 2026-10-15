import {app} from 'electron'
import {existsSync} from 'node:fs'
import path from 'node:path'

function loginItemOptions() {
  // Squirrel's launcher stays at the same path when the installed version changes.
  const launcher = path.resolve(path.dirname(process.execPath), '..', path.basename(process.execPath))
  return {path: existsSync(launcher) ? launcher : process.execPath, args: [] as string[]}
}

export function getStartWithWindows(): boolean {
  if (process.platform !== 'win32' || !app.isPackaged) return false
  const settings = app.getLoginItemSettings(loginItemOptions())
  return settings.openAtLogin && settings.executableWillLaunchAtLogin
}

export function setStartWithWindows(enabled: boolean): void {
  if (process.platform !== 'win32' || !app.isPackaged) return
  app.setLoginItemSettings({...loginItemOptions(), openAtLogin: enabled, enabled})
}
