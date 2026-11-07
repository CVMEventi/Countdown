import {EventEmitter} from 'node:events'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {Menu} from 'electron'
import createCountdownWindow from '../../main/countdownWindow.ts'

const state = vi.hoisted(() => ({window: null as EventEmitter & {webContents: EventEmitter}, popup: vi.fn()}))
vi.mock('../../main/Utilities/BrowserWinHandler.ts', () => ({default: class {
  onCreated(callback: (window: unknown) => void) {callback(state.window)}
  loadPage() {}
}}))
vi.mock('electron', () => ({
  app: {}, globalShortcut: {},
  Menu: {buildFromTemplate: vi.fn(items => ({items, popup: state.popup}))},
}))

beforeEach(() => {
  vi.clearAllMocks()
  state.window = Object.assign(new EventEmitter(), {webContents: new EventEmitter()})
})

describe('timer context-menu shortcut setting', () => {
  it('reuses a popup across native and web context events until the setting changes', () => {
    let enabled = false
    createCountdownWindow('timer', 'Timer', 'window', () => ({}), vi.fn(), () => enabled)
    state.window.emit('system-context-menu', {preventDefault: vi.fn()})
    state.window.webContents.emit('context-menu', {preventDefault: vi.fn()})
    expect(Menu.buildFromTemplate).toHaveBeenCalledOnce()
    expect(state.popup).toHaveBeenCalledTimes(2)
    enabled = true
    state.window.emit('system-context-menu', {preventDefault: vi.fn()})
    state.window.webContents.emit('context-menu', {preventDefault: vi.fn()})
    expect(Menu.buildFromTemplate).toHaveBeenCalledTimes(2)
  })

  it.each(['system-context-menu', 'context-menu'])('updates an existing window on off/on/off changes through %s', eventName => {
    let enabled = false
    const show = vi.fn()
    createCountdownWindow('timer', 'Timer', 'window', () => ({}), show, () => enabled)
    for (const value of [false, true, false]) {
      enabled = value
      const event = {preventDefault: vi.fn()}
      const target = eventName === 'context-menu' ? state.window.webContents : state.window
      target.emit(eventName, event)
      expect(event.preventDefault).toHaveBeenCalledOnce()
      const template = vi.mocked(Menu.buildFromTemplate).mock.lastCall[0]
      expect(template[0]).toMatchObject({label: 'Show main window', click: show})
      expect(template[0].accelerator).toBe(value ? 'CommandOrControl+Shift+M' : undefined)
      expect(template[2]).toMatchObject({label: 'Quit', accelerator: 'CommandOrControl+Q'})
      expect(state.popup).toHaveBeenLastCalledWith({window: state.window})
    }
  })
})
