import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {app} from 'electron'
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import path from 'node:path'
import {canStartAtLogin, getStartAtLogin, setStartAtLogin} from '../../main/Utilities/startAtLogin.ts'

const environment = vi.hoisted(() => ({isPackaged: true}))

vi.mock('electron', () => ({app: {
  get isPackaged() { return environment.isPackaged },
  getLoginItemSettings: vi.fn(),
  setLoginItemSettings: vi.fn(),
  getPath: vi.fn(() => '/home/test'),
}}))
vi.mock('node:fs', () => ({existsSync: vi.fn(), mkdirSync: vi.fn(), readFileSync: vi.fn(), writeFileSync: vi.fn()}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('process', {...process, platform: 'win32', execPath: path.resolve('Countdown', 'app-1.5.1', 'countdown.exe')})
  vi.mocked(existsSync).mockReturnValue(true)
  vi.mocked(readFileSync).mockImplementation(() => { throw Object.assign(new Error('Missing entry'), {code: 'ENOENT'}) })
  vi.stubEnv('XDG_CONFIG_HOME', '')
  vi.stubEnv('APPIMAGE', '')
  environment.isPackaged = true
})

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('Windows startup registration', () => {
  it('uses the stable Squirrel launcher for enabling and disabling startup', () => {
    const launcher = path.resolve(path.dirname(process.execPath), '..', 'countdown.exe')
    setStartAtLogin(true)
    setStartAtLogin(false)
    expect(app.setLoginItemSettings).toHaveBeenNthCalledWith(1, {
      path: launcher, args: [], openAtLogin: true, enabled: true,
    })
    expect(app.setLoginItemSettings).toHaveBeenNthCalledWith(2, {
      path: launcher, args: [], openAtLogin: false, enabled: false,
    })
  })

  it('uses the running executable for standalone packaged builds', () => {
    vi.mocked(existsSync).mockReturnValue(false)
    setStartAtLogin(true)
    expect(app.setLoginItemSettings).toHaveBeenCalledWith({
      path: process.execPath, args: [], openAtLogin: true, enabled: true,
    })
  })

  it('reads the same launcher and respects startup disabled in Task Manager', () => {
    vi.mocked(app.getLoginItemSettings).mockReturnValue({
      openAtLogin: true, executableWillLaunchAtLogin: false,
    } as ReturnType<typeof app.getLoginItemSettings>)
    expect(getStartAtLogin()).toBe(false)
    expect(app.getLoginItemSettings).toHaveBeenCalledWith({
      path: path.resolve(path.dirname(process.execPath), '..', 'countdown.exe'), args: [],
    })
    vi.mocked(app.getLoginItemSettings).mockReturnValue({
      openAtLogin: true, executableWillLaunchAtLogin: true,
    } as ReturnType<typeof app.getLoginItemSettings>)
    expect(getStartAtLogin()).toBe(true)
  })

  it('does not register the development Electron executable', () => {
    environment.isPackaged = false
    setStartAtLogin(true)
    expect(getStartAtLogin()).toBe(false)
    expect(app.setLoginItemSettings).not.toHaveBeenCalled()
    expect(app.getLoginItemSettings).not.toHaveBeenCalled()
  })

  it.each(['aix', 'freebsd'])('does not register unsupported platforms (%s)', platform => {
    vi.stubGlobal('process', {...process, platform})
    setStartAtLogin(true)
    expect(getStartAtLogin()).toBe(false)
    expect(app.setLoginItemSettings).not.toHaveBeenCalled()
    expect(app.getLoginItemSettings).not.toHaveBeenCalled()
  })
})

describe('macOS login items', () => {
  beforeEach(() => vi.stubGlobal('process', {...process, platform: 'darwin'}))

  it('registers and unregisters the application using the native login API', () => {
    expect(canStartAtLogin()).toBe(true)
    setStartAtLogin(true)
    setStartAtLogin(false)
    expect(app.setLoginItemSettings).toHaveBeenNthCalledWith(1, {openAtLogin: true})
    expect(app.setLoginItemSettings).toHaveBeenNthCalledWith(2, {openAtLogin: false})
  })

  it('reads the native setting without Windows-only properties', () => {
    vi.mocked(app.getLoginItemSettings).mockReturnValue({openAtLogin: true} as Electron.LoginItemSettings)
    expect(getStartAtLogin()).toBe(true)
    expect(app.getLoginItemSettings).toHaveBeenCalledWith()
    vi.mocked(app.getLoginItemSettings).mockReturnValue({openAtLogin: false} as Electron.LoginItemSettings)
    expect(getStartAtLogin()).toBe(false)
  })
})

describe('Linux desktop autostart', () => {
  beforeEach(() => vi.stubGlobal('process', {...process, platform: 'linux', execPath: '/opt/Countdown/countdown'}))

  it('writes an entry in the current user autostart directory', () => {
    expect(canStartAtLogin()).toBe(true)
    setStartAtLogin(true)
    expect(mkdirSync).toHaveBeenCalledWith('/home/test/.config/autostart', {recursive: true, mode: 0o700})
    expect(writeFileSync).toHaveBeenCalledWith('/home/test/.config/autostart/countdown.desktop',
      '[Desktop Entry]\nType=Application\nName=Countdown\nExec="/opt/Countdown/countdown"\nTerminal=false\nHidden=false\nX-GNOME-Autostart-enabled=true\n',
      {encoding: 'utf8', mode: 0o600})
    expect(app.setLoginItemSettings).not.toHaveBeenCalled()
  })

  it('uses an absolute XDG_CONFIG_HOME', () => {
    vi.stubEnv('XDG_CONFIG_HOME', '/home/test/custom config')
    setStartAtLogin(true)
    expect(writeFileSync).toHaveBeenCalledWith('/home/test/custom config/autostart/countdown.desktop', expect.any(String), expect.any(Object))
  })

  it('ignores relative XDG_CONFIG_HOME values', () => {
    vi.stubEnv('XDG_CONFIG_HOME', 'relative/config')
    setStartAtLogin(true)
    expect(writeFileSync).toHaveBeenCalledWith('/home/test/.config/autostart/countdown.desktop', expect.any(String), expect.any(Object))
  })

  it('disables startup with a user override', () => {
    setStartAtLogin(false)
    const entry = vi.mocked(writeFileSync).mock.calls[0][1] as string
    expect(entry).toContain('Hidden=true\n')
    expect(entry).toContain('X-GNOME-Autostart-enabled=false\n')
  })

  it('reads an enabled entry and respects disabling in Ubuntu startup tools', () => {
    const entry = '[Desktop Entry]\nType=Application\nExec="/opt/Countdown/countdown"\n'
    vi.mocked(readFileSync).mockReturnValue(entry)
    expect(getStartAtLogin()).toBe(true)
    vi.mocked(readFileSync).mockReturnValue(entry + 'Hidden=true\n')
    expect(getStartAtLogin()).toBe(false)
    vi.mocked(readFileSync).mockReturnValue(entry + 'X-GNOME-Autostart-enabled=false\n')
    expect(getStartAtLogin()).toBe(false)
  })

  it('does not treat another group or an incomplete file as an enabled entry', () => {
    for (const entry of ['[Desktop Action Test]\nType=Application\nExec=countdown\n', '[Desktop Entry]\nType=Application\n']) {
      vi.mocked(readFileSync).mockReturnValue(entry)
      expect(getStartAtLogin()).toBe(false)
    }
  })

  it('returns disabled when there is no entry', () => {
    expect(getStartAtLogin()).toBe(false)
  })

  it('uses the persistent AppImage path instead of its temporary mount', () => {
    vi.stubEnv('APPIMAGE', '/home/test/Apps/Countdown.AppImage')
    setStartAtLogin(true)
    expect(vi.mocked(writeFileSync).mock.calls[0][1]).toContain('Exec="/home/test/Apps/Countdown.AppImage"\n')
  })

  it('quotes spaces, field codes and shell-sensitive characters in the executable path', () => {
    vi.stubGlobal('process', {...process, execPath: '/opt/Countdown $test `x` "a" \\ 50%/countdown'})
    setStartAtLogin(true)
    const entry = vi.mocked(writeFileSync).mock.calls[0][1] as string
    // Undo desktop string escaping, command quoting, then literal-percent escaping.
    const command = entry.split('\n').find(line => line.startsWith('Exec=')).slice(5)
    const decoded = command.replace(/\\\\/g, '\\').slice(1, -1)
      .replace(/\\([\\"`$])/g, '$1').replace(/%%/g, '%')
    expect(decoded).toBe(process.execPath)
  })

  it('does not write an invalid executable path', () => {
    vi.stubGlobal('process', {...process, execPath: '/opt/invalid=path/countdown'})
    expect(() => setStartAtLogin(true)).toThrow('application path')
    expect(writeFileSync).not.toHaveBeenCalled()
  })

  it('propagates write errors so settings autosave can reject the change', () => {
    vi.mocked(writeFileSync).mockImplementationOnce(() => { throw new Error('Permission denied') })
    expect(() => setStartAtLogin(true)).toThrow('Permission denied')
  })
})
