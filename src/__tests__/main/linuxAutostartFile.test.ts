import {afterEach, describe, expect, it, vi} from 'vitest'
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync} from 'node:fs'
import path from 'node:path'
import {getStartAtLogin, setStartAtLogin} from '../../main/Utilities/startAtLogin.ts'

const environment = vi.hoisted(() => ({home: ''}))
vi.mock('electron', () => ({app: {isPackaged: true, getPath: () => environment.home}}))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  const cache = path.resolve('node_modules/.cache') + path.sep
  if (environment.home && path.resolve(environment.home).startsWith(cache)) {
    rmSync(environment.home, {recursive: true, force: true})
  }
})

describe('Linux autostart file persistence', () => {
  it('enables, reads and disables a real per-user desktop entry', () => {
    mkdirSync(path.resolve('node_modules/.cache'), {recursive: true})
    environment.home = mkdtempSync(path.resolve('node_modules/.cache/login-fs-test-')).replace(/\\/g, '/')
    vi.stubGlobal('process', {...process, platform: 'linux', execPath: '/opt/Countdown/countdown'})
    vi.stubEnv('XDG_CONFIG_HOME', '')
    vi.stubEnv('APPIMAGE', '')
    expect(getStartAtLogin()).toBe(false)
    setStartAtLogin(true)
    const filename = path.join(environment.home, '.config/autostart/countdown.desktop')
    expect(existsSync(filename)).toBe(true)
    expect(getStartAtLogin()).toBe(true)
    expect(readFileSync(filename, 'utf8')).toContain('Exec="/opt/Countdown/countdown"\n')
    setStartAtLogin(false)
    expect(getStartAtLogin()).toBe(false)
    expect(readFileSync(filename, 'utf8')).toContain('Hidden=true\n')
    setStartAtLogin(true)
    expect(getStartAtLogin()).toBe(true)
  })
})
