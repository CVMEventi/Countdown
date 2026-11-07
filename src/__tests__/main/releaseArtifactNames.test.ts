import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import config from '../../../forge.config.ts'
import {APP_VERSION} from '../../version.ts'
import type {ForgeMakeResult, ResolvedForgeConfig} from '@electron-forge/shared-types'

let directory: string
beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), 'countdown-artifacts-'))
  vi.stubEnv('CI', 'true')
})
afterEach(() => {
  vi.unstubAllEnvs()
  rmSync(directory, {recursive: true, force: true})
})

async function postMake(names: string[], platform = 'win32', arch = 'x64') {
  const artifacts = names.map(name => path.join(directory, name))
  const results = [{artifacts, platform, arch, packageJSON: {}}] as ForgeMakeResult[]
  const hook = config.hooks?.postMake
  if (typeof hook !== 'function') throw new Error('Missing postMake hook')
  return await hook(config as ResolvedForgeConfig, results)
}

describe('release artifact names', () => {
  it('preserves Squirrel full/delta packages and every RELEASES entry byte for byte', async () => {
    const names = ['countdown-1.6.0-beta2-full.nupkg', 'countdown-1.6.0-beta2-delta.nupkg']
    const manifest = `AAA ${names[0]} 4\r\nBBB ${names[1]} 5\r\n`
    writeFileSync(path.join(directory, names[0]), 'full')
    writeFileSync(path.join(directory, names[1]), 'delta')
    writeFileSync(path.join(directory, 'RELEASES'), manifest)
    const result = await postMake([...names, 'RELEASES'])
    expect(result?.[0].artifacts.map(artifact => path.basename(artifact))).toEqual([...names, 'RELEASES'])
    expect(readFileSync(path.join(directory, 'RELEASES'), 'utf8')).toBe(manifest)
    expect(readFileSync(path.join(directory, names[0]), 'utf8')).toBe('full')
    expect(readFileSync(path.join(directory, names[1]), 'utf8')).toBe('delta')
  })

  it.each([
    ['win32', 'x64', 'Countdown Setup.exe', `Countdown-Windows-x64-${APP_VERSION}.exe`],
    ['linux', 'x64', 'countdown.deb', `Countdown-Linux-x64-${APP_VERSION}.deb`],
    ['darwin', 'arm64', 'Countdown.dmg', `Countdown-macOS-arm64-${APP_VERSION}.dmg`],
  ])('keeps installer naming on %s/%s', async (platform, arch, original, expected) => {
    writeFileSync(path.join(directory, original), 'installer')
    const result = await postMake([original], platform, arch)
    expect(result?.[0].artifacts).toEqual([path.join(directory, expected)])
    expect(existsSync(path.join(directory, original))).toBe(false)
    expect(readFileSync(path.join(directory, expected), 'utf8')).toBe('installer')
  })
})
