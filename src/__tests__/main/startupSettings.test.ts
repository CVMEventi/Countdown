import {beforeEach, describe, expect, it, vi} from 'vitest'
import {ipcMain} from 'electron'
import addIpcHandles from '../../main/Utilities/addIpcHandles.ts'
import {setStartWithWindows} from '../../main/Utilities/windowsStartup.ts'
import {DEFAULT_STORE} from '../../common/config.ts'
import type {CountdownApp} from '../../main/App.ts'

vi.mock('electron', () => ({
  app: {isPackaged: true}, ipcMain: {handle: vi.fn(), on: vi.fn()},
}))
vi.mock('../../main/Utilities/windowsStartup.ts', () => ({setStartWithWindows: vi.fn()}))

beforeEach(() => vi.clearAllMocks())

function setup() {
  const config = {
    settings: structuredClone(DEFAULT_STORE.defaults.settings),
    set: vi.fn((key: string | null, value: unknown) => {
      if (key === null) config.settings = value as typeof config.settings
      else Object.assign(config.settings, {[key]: value})
      return config.settings
    }),
  }
  addIpcHandles({
    config,
    timersOrchestrator: {
      configUpdated: vi.fn(), stopNdi: vi.fn(), stopOmt: vi.fn(), setNdiAlpha: vi.fn(),
    },
    stopNdiTimer: vi.fn(), stopOmtTimer: vi.fn(),
    oscServer: {stop: vi.fn()}, refreshDiscovery: vi.fn(),
  } as unknown as CountdownApp)
  const handler = vi.mocked(ipcMain.handle).mock.calls.find(([channel]) => channel === 'settings:set')[1]
  return {config, save: (key: string | null, value: unknown) => handler({} as Electron.IpcMainInvokeEvent, key, value)}
}

describe('startup settings autosave', () => {
  it('registers and unregisters startup through full settings saves', async () => {
    const {config, save} = setup()
    await save(null, {...config.settings, startWithWindows: true})
    expect(config.settings.startWithWindows).toBe(true)
    expect(setStartWithWindows).toHaveBeenNthCalledWith(1, true)
    await save(null, {...config.settings, startWithWindows: false})
    expect(config.settings.startWithWindows).toBe(false)
    expect(setStartWithWindows).toHaveBeenNthCalledWith(2, false)
  })

  it('supports saving the individual startup setting', async () => {
    const {save} = setup()
    await save('startWithWindows', true)
    expect(setStartWithWindows).toHaveBeenCalledWith(true)
  })

  it('leaves startup registration alone for unrelated saves', async () => {
    const {config, save} = setup()
    await save(null, {...config.settings, startHidden: true})
    await save('presets', [5, 10])
    expect(setStartWithWindows).not.toHaveBeenCalled()
  })

  it('does not persist an enabled setting if registration fails', async () => {
    const {config, save} = setup()
    vi.mocked(setStartWithWindows).mockImplementationOnce(() => { throw new Error('Registration failed') })
    await expect(save('startWithWindows', true)).rejects.toThrow('Registration failed')
    expect(config.set).not.toHaveBeenCalled()
    expect(config.settings.startWithWindows).toBe(false)
  })
})
