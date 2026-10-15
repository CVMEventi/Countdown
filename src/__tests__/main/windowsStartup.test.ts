import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {app} from 'electron'
import {existsSync} from 'node:fs'
import path from 'node:path'
import {getStartWithWindows, setStartWithWindows} from '../../main/Utilities/windowsStartup.ts'

const environment = vi.hoisted(() => ({isPackaged: true}))

vi.mock('electron', () => ({app: {
  get isPackaged() { return environment.isPackaged },
  getLoginItemSettings: vi.fn(),
  setLoginItemSettings: vi.fn(),
}}))
vi.mock('node:fs', () => ({existsSync: vi.fn()}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('process', {...process, platform: 'win32', execPath: path.resolve('Countdown', 'app-1.5.1', 'countdown.exe')})
  vi.mocked(existsSync).mockReturnValue(true)
  environment.isPackaged = true
})

afterEach(() => vi.unstubAllGlobals())

describe('Windows startup registration', () => {
  it('uses the stable Squirrel launcher for enabling and disabling startup', () => {
    const launcher = path.resolve(path.dirname(process.execPath), '..', 'countdown.exe')
    setStartWithWindows(true)
    setStartWithWindows(false)
    expect(app.setLoginItemSettings).toHaveBeenNthCalledWith(1, {
      path: launcher, args: [], openAtLogin: true, enabled: true,
    })
    expect(app.setLoginItemSettings).toHaveBeenNthCalledWith(2, {
      path: launcher, args: [], openAtLogin: false, enabled: false,
    })
  })

  it('uses the running executable for standalone packaged builds', () => {
    vi.mocked(existsSync).mockReturnValue(false)
    setStartWithWindows(true)
    expect(app.setLoginItemSettings).toHaveBeenCalledWith({
      path: process.execPath, args: [], openAtLogin: true, enabled: true,
    })
  })

  it('reads the same launcher and respects startup disabled in Task Manager', () => {
    vi.mocked(app.getLoginItemSettings).mockReturnValue({
      openAtLogin: true, executableWillLaunchAtLogin: false,
    } as ReturnType<typeof app.getLoginItemSettings>)
    expect(getStartWithWindows()).toBe(false)
    expect(app.getLoginItemSettings).toHaveBeenCalledWith({
      path: path.resolve(path.dirname(process.execPath), '..', 'countdown.exe'), args: [],
    })
    vi.mocked(app.getLoginItemSettings).mockReturnValue({
      openAtLogin: true, executableWillLaunchAtLogin: true,
    } as ReturnType<typeof app.getLoginItemSettings>)
    expect(getStartWithWindows()).toBe(true)
  })

  it('does not register the development Electron executable', () => {
    environment.isPackaged = false
    setStartWithWindows(true)
    expect(getStartWithWindows()).toBe(false)
    expect(app.setLoginItemSettings).not.toHaveBeenCalled()
    expect(app.getLoginItemSettings).not.toHaveBeenCalled()
  })

  it.each(['darwin', 'linux'])('does not call Windows APIs on %s', platform => {
    vi.stubGlobal('process', {...process, platform})
    setStartWithWindows(true)
    expect(getStartWithWindows()).toBe(false)
    expect(app.setLoginItemSettings).not.toHaveBeenCalled()
    expect(app.getLoginItemSettings).not.toHaveBeenCalled()
  })
})
