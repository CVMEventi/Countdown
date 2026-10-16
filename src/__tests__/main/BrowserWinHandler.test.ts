import {beforeEach, describe, expect, it, vi} from 'vitest'
import {app} from 'electron'
import BrowserWinHandler from '../../main/Utilities/BrowserWinHandler.ts'

const state = vi.hoisted(() => ({ready: true, options: [] as Electron.BrowserWindowConstructorOptions[]}))

vi.mock('electron', async () => {
  const {EventEmitter} = await import('node:events')
  class Window extends EventEmitter {
    visible = false
    destroyed = false
    fullscreen = false
    webContents = {setWindowOpenHandler: vi.fn()}
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
  return {BrowserWindow: Window, app: Object.assign(new EventEmitter(), {isReady: () => state.ready}), shell: {openExternal: vi.fn()}}
})

beforeEach(() => { state.ready = true; state.options = []; app.removeAllListeners() })

describe('window startup visibility', () => {
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
