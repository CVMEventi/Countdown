import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {app, globalShortcut, Menu} from 'electron'
import {registerGlobalShortcuts, SHOW_MAIN_WINDOW_SHORTCUT, unregisterGlobalShortcuts} from '../../main/Utilities/globalShortcuts.ts'
import {applicationMenu} from '../../main/Utilities/applicationMenu.ts'

vi.mock('../../main/Utilities/waylandShortcut.ts', () => ({registerWaylandShortcut: vi.fn(async () => true)}))

vi.mock('electron', () => ({
  app: {once: vi.fn()},
  globalShortcut: {register: vi.fn(), unregister: vi.fn()},
  Menu: {buildFromTemplate: vi.fn(template => template)},
}))

beforeEach(() => {
  unregisterGlobalShortcuts()
  vi.clearAllMocks()
  vi.stubGlobal('process', {...process, platform: 'win32'})
  vi.mocked(globalShortcut.register).mockReturnValue(true)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs()})

describe('Show main window global shortcut', () => {
  it('restores the window through the same callback as the menu', async () => {
    const show = vi.fn()
    expect(await registerGlobalShortcuts(show)).toBe(true)
    expect(globalShortcut.register).toHaveBeenCalledWith('CommandOrControl+Shift+M', show)
    vi.mocked(globalShortcut.register).mock.calls[0][1]()
    expect(show).toHaveBeenCalledOnce()
    applicationMenu(show)
    expect(Menu.buildFromTemplate).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({label: 'Show main window', accelerator: SHOW_MAIN_WINDOW_SHORTCUT, click: show}),
    ]))
  })

  it('releases only its own shortcut on quit', async () => {
    await registerGlobalShortcuts(vi.fn())
    expect(app.once).toHaveBeenCalledWith('will-quit', expect.any(Function))
    vi.mocked(app.once).mock.calls[0][1]()
    expect(globalShortcut.unregister).toHaveBeenCalledExactlyOnceWith(SHOW_MAIN_WINDOW_SHORTCUT)
  })

  it('releases the shortcut when the setting is turned off', async () => {
    await registerGlobalShortcuts(vi.fn())
    unregisterGlobalShortcuts()
    expect(globalShortcut.unregister).toHaveBeenCalledExactlyOnceWith(SHOW_MAIN_WINDOW_SHORTCUT)
    // Quitting afterwards does not release it a second time
    vi.mocked(app.once).mock.calls[0][1]()
    expect(globalShortcut.unregister).toHaveBeenCalledOnce()
  })

  it('registers only once while enabled and again after being turned off', async () => {
    await registerGlobalShortcuts(vi.fn())
    expect(await registerGlobalShortcuts(vi.fn())).toBe(true)
    expect(globalShortcut.register).toHaveBeenCalledOnce()
    unregisterGlobalShortcuts()
    await registerGlobalShortcuts(vi.fn())
    expect(globalShortcut.register).toHaveBeenCalledTimes(2)
  })

  it('can retry after the shortcut was unavailable', async () => {
    vi.mocked(globalShortcut.register).mockReturnValueOnce(false)
    expect(await registerGlobalShortcuts(vi.fn())).toBe(false)
    expect(await registerGlobalShortcuts(vi.fn())).toBe(true)
  })

  it('keeps the app usable when another app owns the shortcut', async () => {
    vi.mocked(globalShortcut.register).mockReturnValue(false)
    expect(await registerGlobalShortcuts(vi.fn())).toBe(false)
    expect(console.warn).toHaveBeenCalledOnce()
    expect(app.once).not.toHaveBeenCalled()
    expect(globalShortcut.unregister).not.toHaveBeenCalled()
  })

  it('handles an unavailable system shortcut service without aborting startup', async () => {
    vi.mocked(globalShortcut.register).mockImplementation(() => {throw new Error('Unavailable')})
    expect(await registerGlobalShortcuts(vi.fn())).toBe(false)
    expect(console.warn).toHaveBeenCalledOnce()
  })
})

describe('Linux shortcut backend', () => {
  it('uses native X11 shortcuts outside a Wayland session', async () => {
    vi.stubGlobal('process', {...process, platform: 'linux'})
    vi.stubEnv('WAYLAND_DISPLAY', '')
    vi.stubEnv('XDG_SESSION_TYPE', 'x11')
    expect(await registerGlobalShortcuts(vi.fn())).toBe(true)
    expect(globalShortcut.register).toHaveBeenCalledOnce()
  })

  it('uses the desktop portal for Wayland, including XWayland windows', async () => {
    vi.stubGlobal('process', {...process, platform: 'linux'})
    vi.stubEnv('WAYLAND_DISPLAY', 'wayland-0')
    const show = vi.fn()
    expect(await registerGlobalShortcuts(show)).toBe(true)
    const {registerWaylandShortcut} = await import('../../main/Utilities/waylandShortcut.ts')
    expect(registerWaylandShortcut).toHaveBeenCalledWith(show, expect.any(AbortSignal))
    expect(globalShortcut.register).not.toHaveBeenCalled()
  })
})
