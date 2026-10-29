import {EventEmitter} from 'node:events'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {app} from 'electron'
import {registerWaylandShortcut} from '../../main/Utilities/waylandShortcut.ts'

type TestMessage = {member: string, interface?: string, body?: unknown[]}
type TestBus = {name: string, connection: EventEmitter & {stream: {destroy: ReturnType<typeof vi.fn>}}, invoke: ReturnType<typeof vi.fn>}
const state = vi.hoisted(() => ({bus: null as TestBus, denied: false, saved: false, unavailable: false, oldPortal: false, messages: [] as TestMessage[]}))
vi.mock('@homebridge/dbus-native', () => ({default: {sessionBus: () => state.bus}}))
vi.mock('electron', async () => {
  const {EventEmitter} = await import('node:events')
  return {app: new EventEmitter()}
})

const ROOT = '/org/freedesktop/portal/desktop'
const IFACE = 'org.freedesktop.portal.GlobalShortcuts'
const session = `${ROOT}/session/1_42/test`
const entry = (key: string, value: unknown) => [key, [[], [value]]]

beforeEach(() => {
  state.denied = state.saved = state.unavailable = state.oldPortal = false
  state.messages = []
  const connection = Object.assign(new EventEmitter(), {stream: {destroy: vi.fn()}})
  state.bus = {name: ':1.42', connection, invoke: vi.fn((message, callback) => {
    state.messages.push(message)
    if (state.unavailable) return callback(new Error('Service unavailable'))
    if (message.member === 'Register' && state.oldPortal) return callback({name: 'org.freedesktop.DBus.Error.UnknownMethod'})
    if (message.member === 'GetNameOwner') return callback(null, ':1.10')
    if (message.interface === IFACE) {
      const options = message.body.at(-1)
      const token = options.find((option: [string, [string, string]]) => option[0] === 'handle_token')[1][1]
      const path = `${ROOT}/request/1_42/${token}`
      const values = message.member === 'CreateSession' ? [entry('session_handle', session)]
        : message.member === 'ListShortcuts' ? [entry('shortcuts', state.saved ? [['show-main-window', []]] : [])] : []
      // Deliver a response before the method reply to catch subscription races.
      connection.emit('message', {type: 4, sender: ':1.10', interface: 'org.freedesktop.portal.Request',
        member: 'Response', path, body: [state.denied && message.member === 'BindShortcuts' ? 1 : 0, values]})
      return callback(null, path)
    }
    callback(null)
  })}
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  app.emit('will-quit')
  app.removeAllListeners()
  vi.restoreAllMocks()
})

describe('Wayland global Show main window shortcut', () => {
  it('requests the shortcut and only accepts activation from its own portal session', async () => {
    const show = vi.fn()
    expect(await registerWaylandShortcut(show)).toBe(true)
    const bind = state.messages.find(message => message.member === 'BindShortcuts')
    expect(bind.body[1]).toEqual([['show-main-window', [
      ['description', ['s', 'Show main window']], ['preferred_trigger', ['s', 'CTRL+SHIFT+m']],
    ]]])
    const activated = {type: 4, sender: ':1.10', interface: IFACE, member: 'Activated',
      body: [session, 'show-main-window', 1, []] as unknown[]}
    state.bus.connection.emit('message', {...activated, sender: ':1.99'})
    state.bus.connection.emit('message', {...activated, body: ['/another/session', 'show-main-window']})
    state.bus.connection.emit('message', {...activated, body: [session, 'another-shortcut']})
    expect(show).not.toHaveBeenCalled()
    state.bus.connection.emit('message', activated)
    expect(show).toHaveBeenCalledOnce()
  })

  it('reuses a saved grant without opening another permission dialog', async () => {
    state.saved = true
    expect(await registerWaylandShortcut(vi.fn())).toBe(true)
    expect(state.messages.some(message => message.member === 'BindShortcuts')).toBe(false)
  })

  it('disconnects and releases the shortcut when the user denies permission', async () => {
    state.denied = true
    expect(await registerWaylandShortcut(vi.fn())).toBe(false)
    expect(state.bus.connection.stream.destroy).toHaveBeenCalledOnce()
    expect(app.listenerCount('will-quit')).toBe(0)
  })

  it('closes the session on quit and stops receiving shortcuts', async () => {
    const show = vi.fn()
    await registerWaylandShortcut(show)
    app.emit('will-quit')
    expect(state.bus.connection.stream.destroy).toHaveBeenCalledOnce()
    expect(state.bus.connection.listenerCount('message')).toBe(0)
    expect(show).not.toHaveBeenCalled()
  })

  it('keeps startup usable when no global shortcut portal is available', async () => {
    state.unavailable = true
    expect(await registerWaylandShortcut(vi.fn())).toBe(false)
    expect(state.bus.connection.stream.destroy).toHaveBeenCalledOnce()
  })

  it('supports older portals without the application registry interface', async () => {
    state.oldPortal = true
    expect(await registerWaylandShortcut(vi.fn())).toBe(true)
  })

  it('releases the session if the desktop service disconnects', async () => {
    await registerWaylandShortcut(vi.fn())
    state.bus.connection.emit('error', new Error('Disconnected'))
    expect(state.bus.connection.stream.destroy).toHaveBeenCalledOnce()
    expect(app.listenerCount('will-quit')).toBe(0)
  })

  it('releases the session when the shortcut is turned off', async () => {
    const controller = new AbortController()
    const show = vi.fn()
    expect(await registerWaylandShortcut(show, controller.signal)).toBe(true)
    controller.abort()
    expect(state.bus.connection.stream.destroy).toHaveBeenCalledOnce()
    expect(app.listenerCount('will-quit')).toBe(0)
    state.bus.connection.emit('message', {type: 4, sender: ':1.10', interface: IFACE,
      member: 'Activated', body: [session, 'show-main-window']})
    expect(show).not.toHaveBeenCalled()
  })
})
