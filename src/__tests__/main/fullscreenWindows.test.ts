import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {screen} from 'electron'
import {setProperty} from 'dot-prop'
import {DEFAULT_WINDOW_SETTINGS, type WindowSettings} from '../../common/config.ts'
import {rememberFullscreenDisplay} from '../../common/fullscreenDisplay.ts'
import {TimersOrchestrator} from '../../main/Utilities/TimersOrchestrator.ts'
import type {CountdownApp} from '../../main/App.ts'
import type BrowserWinHandler from '../../main/Utilities/BrowserWinHandler.ts'

const creation = vi.hoisted(() => ({options: null as (() => Electron.BrowserWindowConstructorOptions) | null}))
vi.mock('../../main/countdownWindow.ts', () => ({default: vi.fn((_timer, _name, _window, options) => {
  creation.options = options
  return {onCreated: vi.fn()}
})}))
vi.mock('electron', () => ({
  BrowserWindow: class {}, powerMonitor: {on: vi.fn()},
  screen: {getAllDisplays: vi.fn(), getDisplayMatching: vi.fn()},
}))
vi.mock('../../main/Remotes/NDI.ts', () => ({default: class {}}))
vi.mock('../../main/Remotes/OMT.ts', () => ({default: class {}}))

const monitor = (id: number) => ({
  id, label: 'Projector', internal: false, bounds: {x: 1920, y: 0, width: 1920, height: 1080},
} as Electron.Display)

beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); vi.mocked(screen.getAllDisplays).mockReturnValue([])
  // macOS waits for native fullscreen events, covered separately in setFullScreen.test.ts
  vi.stubGlobal('process', {...process, platform: 'win32'})
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

function setup() {
  const app = {
    config: {
      settings: {timers: {}},
      set: vi.fn((key: string, value: unknown) => setProperty(app.config.settings, key, value)),
    },
    mainWindowHandler: {browserWindow: {isDestroyed: () => false, webContents: {send: vi.fn()}}},
  }
  const orchestrator = new TimersOrchestrator(app as unknown as CountdownApp)
  const settings = structuredClone(DEFAULT_WINDOW_SETTINGS)
  settings.bounds = rememberFullscreenDisplay(settings.bounds, monitor(10))
  let fullscreen = false
  let destroyed = false
  const window = {
    get fullScreen() { return fullscreen },
    isFullScreen: () => fullscreen,
    isDestroyed: () => destroyed,
    isVisible: () => true,
    setFullScreen: vi.fn((value: boolean) => { fullscreen = value }),
    setPosition: vi.fn(), setBounds: vi.fn(), setAlwaysOnTop: vi.fn(),
    getBounds: () => ({x: 0, y: 0, width: 1280, height: 720}),
  }
  const visible = vi.fn()
  const handler = {browserWindow: window, setVisibleWhenReady: visible} as unknown as BrowserWinHandler
  Object.assign(app.config.settings.timers, {timer: {windows: {window: settings}}})
  orchestrator.timers.timer = {settings: {windows: {window: settings}}, windows: {window: handler}} as never
  return {app, orchestrator, settings, handler, window, visible, destroy: () => { destroyed = true }}
}

describe('fullscreen countdown windows', () => {
  it('does not throw or clear the saved selection when the screen is missing', async () => {
    const {orchestrator, settings, handler, window} = setup()
    const pending = orchestrator._setCountdownWindowPosition(handler, settings)
    await vi.runAllTimersAsync()
    await expect(pending).resolves.toBeUndefined()
    expect(settings.bounds.fullscreenOn).toBe(10)
    expect(window.setFullScreen).not.toHaveBeenCalled()
  })

  it('persists a changed ID and updates the settings UI before placing the window', async () => {
    const {orchestrator, app, settings, window} = setup()
    vi.mocked(screen.getAllDisplays).mockReturnValue([monitor(20)])
    orchestrator.refreshDisplays()
    await vi.runAllTimersAsync()
    expect(settings.bounds.fullscreenOn).toBe(20)
    expect(app.config.set).toHaveBeenCalledOnce()
    expect(app.mainWindowHandler.browserWindow.webContents.send).toHaveBeenCalledWith(
      'window-bounds:updated', 'timer', 'window', settings.bounds,
    )
    expect(window.setPosition).toHaveBeenCalledWith(1920, 0)
    expect(window.setFullScreen).toHaveBeenCalledWith(true)
  })

  it('retries fullscreen placement when the display connects after startup', async () => {
    const {orchestrator, window} = setup()
    orchestrator.refreshDisplays()
    await vi.runAllTimersAsync()
    expect(window.setPosition).not.toHaveBeenCalled()
    vi.mocked(screen.getAllDisplays).mockReturnValue([monitor(20)])
    orchestrator.refreshDisplays()
    await vi.runAllTimersAsync()
    expect(window.setFullScreen).toHaveBeenCalledWith(true)
  })

  it('remembers a legacy selection once that display is available', () => {
    const {orchestrator, settings} = setup()
    delete settings.bounds.fullscreenDisplay
    vi.mocked(screen.getAllDisplays).mockReturnValue([monitor(10)])
    orchestrator.refreshDisplays()
    expect(settings.bounds.fullscreenDisplay?.label).toBe('Projector')
  })

  it('enters fullscreen immediately without a fixed startup delay', async () => {
    const {orchestrator, settings, handler, window} = setup()
    vi.mocked(screen.getAllDisplays).mockReturnValue([monitor(10)])
    await orchestrator._setCountdownWindowPosition(handler, settings)
    expect(window.setPosition).toHaveBeenCalledWith(1920, 0)
    expect(window.isFullScreen()).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('ignores an old fullscreen request after switching to windowed mode', async () => {
    const {orchestrator, settings, handler, window} = setup()
    vi.mocked(screen.getAllDisplays).mockReturnValue([monitor(10)])
    const oldRequest = orchestrator._setCountdownWindowPosition(handler, settings)
    const windowed: WindowSettings = {...settings, bounds: {...settings.bounds, fullscreenOn: null}}
    await orchestrator._setCountdownWindowPosition(handler, windowed)
    await vi.runAllTimersAsync()
    await oldRequest
    expect(window.isFullScreen()).toBe(false)
    expect(window.setBounds).toHaveBeenCalledOnce()
  })

  it('ignores a window destroyed while waiting for fullscreen placement', async () => {
    const {orchestrator, settings, handler, visible, destroy} = setup()
    vi.mocked(screen.getAllDisplays).mockReturnValue([monitor(10)])
    const pending = orchestrator._setCountdownWindowPosition(handler, settings)
    destroy()
    await vi.runAllTimersAsync()
    await pending
    expect(visible).not.toHaveBeenCalledWith(true)
  })

  it('constructs the native window fullscreen on its saved display before it is shown', () => {
    const {orchestrator, settings} = setup()
    const create = orchestrator as unknown as {
      _createWindow(timerId: string, name: string, windowId: string, settings: WindowSettings): void
    }
    create._createWindow('timer', 'Timer', 'window', settings)
    vi.mocked(screen.getAllDisplays).mockReturnValue([monitor(20)])
    const options = creation.options()
    expect(options).toMatchObject({fullscreen: true, show: false, x: 1920, y: 0, width: 1920, height: 1080})
  })

  it('keeps a hidden fullscreen output hidden', async () => {
    const {orchestrator, settings, handler, visible} = setup()
    settings.bounds.hidden = true
    vi.mocked(screen.getAllDisplays).mockReturnValue([monitor(10)])
    await orchestrator._setCountdownWindowPosition(handler, settings)
    expect(visible).toHaveBeenLastCalledWith(false)
  })
})
