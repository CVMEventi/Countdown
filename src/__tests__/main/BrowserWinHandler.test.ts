import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {app} from 'electron'
import BrowserWinHandler from '../../main/Utilities/BrowserWinHandler.ts'

const state = vi.hoisted(() => ({ready: true, options: [] as Electron.BrowserWindowConstructorOptions[]}))

vi.mock('electron', async () => {
  const {EventEmitter} = await import('node:events')
  class Window extends EventEmitter {
    visible = false
    destroyed = false
    fullscreen = false
    webContents = {setWindowOpenHandler: vi.fn(), send: vi.fn()}
    show = vi.fn(() => { this.visible = true })
    hide = vi.fn(() => { this.visible = false })
    isVisible = () => this.visible
    isDestroyed = () => this.destroyed
    isFullScreen = () => this.fullscreen
    constructor(options: Electron.BrowserWindowConstructorOptions) {
      super()
      state.options.push(options)
      this.fullscreen = !!options.fullscreen
    }
  }
  return {BrowserWindow: Window, app: Object.assign(new EventEmitter(), {isReady: () => state.ready}), shell: {openExternal: vi.fn()}, nativeImage: {createFromPath: vi.fn(() => ({}))}}
})

beforeEach(() => { state.ready = true; state.options = []; app.removeAllListeners() })
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

describe('window startup visibility', () => {
  it('reveals ready content when the window manager has already mapped the window', () => {
    const handler = new BrowserWinHandler({show: true, fullscreen: true})
    const window = handler.browserWindow
    Object.assign(window, {visible: true})
    window.emit('ready-to-show')
    expect(window.webContents.send).not.toHaveBeenCalled()
    window.emit('renderer-ready')
    expect(window.webContents.send).toHaveBeenCalledWith('window:visibility', true)
    expect(window.show).not.toHaveBeenCalled()
  })
  it('shows the first frame only after native paint and saved renderer settings are ready', () => {
    const handler = new BrowserWinHandler({show: true})
    const window = handler.browserWindow
    expect(state.options[0].show).toBe(false)
    window.emit('ready-to-show')
    expect(window.isVisible()).toBe(false)
    window.emit('renderer-ready')
    expect(window.isVisible()).toBe(true)
  })

  it('also waits for native paint when renderer settings finish first', () => {
    const handler = new BrowserWinHandler({show: true})
    const window = handler.browserWindow
    window.emit('renderer-ready')
    expect(window.isVisible()).toBe(false)
    window.emit('ready-to-show')
    expect(window.isVisible()).toBe(true)
  })

  it('shows a saved fullscreen output in fullscreen on its first visible frame', () => {
    const handler = new BrowserWinHandler(() => ({fullscreen: true, show: false}))
    const window = handler.browserWindow
    handler.setVisibleWhenReady(true)
    expect(window.isVisible()).toBe(false)
    window.emit('ready-to-show')
    window.emit('renderer-ready')
    expect(window.isVisible()).toBe(true)
    expect(window.isFullScreen()).toBe(true)
  })

  it('respects a hide request made while the page is loading', () => {
    const handler = new BrowserWinHandler({show: true})
    const window = handler.browserWindow
    handler.setVisibleWhenReady(false)
    window.emit('ready-to-show')
    window.emit('renderer-ready')
    expect(window.isVisible()).toBe(false)
    handler.setVisibleWhenReady(true)
    expect(window.isVisible()).toBe(true)
  })

  it('keeps background and start-hidden windows hidden after loading', () => {
    const handler = new BrowserWinHandler({show: false})
    const window = handler.browserWindow
    window.emit('ready-to-show')
    window.emit('renderer-ready')
    expect(window.isVisible()).toBe(false)
  })

  it('reveals the content of hidden windows so NDI and OMT do not capture a blank frame', () => {
    const handler = new BrowserWinHandler({show: false})
    const window = handler.browserWindow
    window.emit('ready-to-show')
    window.emit('renderer-ready')
    expect(window.show).not.toHaveBeenCalled()
    expect(window.webContents.send).toHaveBeenCalledWith('window:visibility', true)
  })

  it('shows the window anyway when the renderer never reports ready', () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const handler = new BrowserWinHandler({show: true})
    const window = handler.browserWindow
    window.emit('ready-to-show')
    vi.advanceTimersByTime(9999)
    expect(window.isVisible()).toBe(false)
    vi.advanceTimersByTime(1)
    expect(window.isVisible()).toBe(true)
    expect(console.warn).toHaveBeenCalledOnce()
  })

  it('does not warn when the renderer reports ready in time', () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const handler = new BrowserWinHandler({show: true})
    handler.browserWindow.emit('renderer-ready')
    vi.advanceTimersByTime(20000)
    expect(console.warn).not.toHaveBeenCalled()
  })

  it('resolves startup options after Electron is ready', () => {
    state.ready = false
    let displayX = 0
    new BrowserWinHandler(() => ({x: displayX, fullscreen: true}))
    expect(state.options).toHaveLength(0)
    displayX = 1920
    app.emit('ready')
    expect(state.options[0]).toMatchObject({x: 1920, fullscreen: true, show: false})
  })
})
