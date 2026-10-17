import {app} from 'electron'
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import path from 'node:path'

function loginItemOptions() {
  // Squirrel's launcher stays at the same path when the installed version changes.
  const launcher = path.resolve(path.dirname(process.execPath), '..', path.basename(process.execPath))
  return {path: existsSync(launcher) ? launcher : process.execPath, args: [] as string[]}
}

export function canStartAtLogin(): boolean {
  return app.isPackaged && ['win32', 'darwin', 'linux'].includes(process.platform)
}

function linuxAutostartFile(): string {
  const configured = process.env.XDG_CONFIG_HOME
  const configHome = configured && path.posix.isAbsolute(configured)
    ? configured : path.posix.join(app.getPath('home'), '.config')
  return path.posix.join(configHome, 'autostart', 'countdown.desktop')
}

function quoteDesktopArgument(value: string): string {
  // Exec quoting is applied after desktop-entry string unescaping.
  const quoted = value.replace(/[\\"`$]/g, character => '\\' + character)
  const escaped = quoted.replace(/\\/g, '\\\\').replace(/%/g, '%%')
    .replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
  return `"${escaped}"`
}

function linuxDesktopEntry(enabled: boolean): string {
  const executable = process.env.APPIMAGE || process.execPath
  if (!path.posix.isAbsolute(executable) || executable.includes('=')) {
    throw new Error('The application path cannot be used in a login entry.')
  }
  return [
    '[Desktop Entry]', 'Type=Application', 'Name=Countdown',
    `Exec=${quoteDesktopArgument(executable)}`, 'Terminal=false',
    `Hidden=${!enabled}`, `X-GNOME-Autostart-enabled=${enabled}`, '',
  ].join('\n')
}

function linuxStartAtLogin(): boolean {
  let entry: string
  try {
    entry = readFileSync(linuxAutostartFile(), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.warn('Could not read login entry:', error)
    return false
  }
  // Ignore keys in other desktop-entry groups and honor desktop startup managers.
  let inEntry = false
  const values = new Map<string, string>()
  for (const line of entry.split(/\r?\n/)) {
    const text = line.trim()
    if (text.startsWith('[')) inEntry = text === '[Desktop Entry]'
    else if (inEntry && !text.startsWith('#')) {
      const separator = text.indexOf('=')
      if (separator > 0) values.set(text.slice(0, separator).trim(), text.slice(separator + 1).trim())
    }
  }
  return values.get('Type') === 'Application' && !!values.get('Exec') &&
    values.get('Hidden') !== 'true' && values.get('X-GNOME-Autostart-enabled') !== 'false'
}

export function getStartAtLogin(): boolean {
  if (!canStartAtLogin()) return false
  if (process.platform === 'linux') return linuxStartAtLogin()
  if (process.platform === 'darwin') return app.getLoginItemSettings().openAtLogin
  const settings = app.getLoginItemSettings(loginItemOptions())
  return settings.openAtLogin && settings.executableWillLaunchAtLogin
}

export function setStartAtLogin(enabled: boolean): void {
  if (!canStartAtLogin()) return
  if (process.platform === 'linux') {
    const filename = linuxAutostartFile()
    const entry = linuxDesktopEntry(enabled)
    mkdirSync(path.posix.dirname(filename), {recursive: true, mode: 0o700})
    // Retain a disabled user entry to override any system-wide autostart entry.
    writeFileSync(filename, entry, {encoding: 'utf8', mode: 0o600})
  } else if (process.platform === 'darwin') {
    app.setLoginItemSettings({openAtLogin: enabled})
  } else {
    app.setLoginItemSettings({...loginItemOptions(), openAtLogin: enabled, enabled})
  }
}
