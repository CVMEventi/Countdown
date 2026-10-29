import {app} from 'electron'
import dbus from '@homebridge/dbus-native'
import type {MessageBus} from '@homebridge/dbus-native'
import {randomUUID} from 'node:crypto'

const PORTAL = 'org.freedesktop.portal.Desktop'
const ROOT = '/org/freedesktop/portal/desktop'
const SHORTCUTS = 'org.freedesktop.portal.GlobalShortcuts'
const REQUEST = 'org.freedesktop.portal.Request'
const SHORTCUT_ID = 'show-main-window'

type Message = {type?: number, sender?: string, path?: string, interface?: string, member?: string, signature?: string, body?: unknown[], destination?: string}
type Values = [string, [unknown, unknown[]]][]
const value = (values: Values, key: string) => values.find(entry => entry[0] === key)?.[1][1][0]

// The package's runtime API includes sessionBus/name, which its typings omit.
const sessionBus = (dbus as typeof dbus & {sessionBus(): MessageBus & {name: string}}).sessionBus

export async function registerWaylandShortcut(showMainWindow: () => void, signal?: AbortSignal): Promise<boolean> {
  const bus = sessionBus()
  let closed = false
  let owner: string
  let session: string
  const pending = new Map<string, {resolve: (values: Values) => void, reject: (error: Error) => void}>()
  const close = () => {
    if (closed) return
    closed = true
    pending.forEach(request => request.reject(new Error('Shortcut session closed')))
    pending.clear()
    bus.connection.removeListener('message', onMessage)
    // Disconnecting closes the portal session and releases its shortcut.
    bus.connection.stream.destroy()
    app.removeListener('will-quit', close)
    signal?.removeEventListener('abort', close)
  }
  const onMessage = (message: Message) => {
    if (closed || message.type !== 4 || message.sender !== owner) return
    if (message.interface === REQUEST && message.member === 'Response') {
      const request = pending.get(message.path)
      if (!request) return
      pending.delete(message.path)
      const [code, results] = message.body as [number, Values]
      if (code === 0) request.resolve(results)
      else request.reject(new Error(code === 1 ? 'Shortcut permission declined' : 'Shortcut request failed'))
    } else if (message.interface === SHORTCUTS && message.member === 'Activated'
      && message.body?.[0] === session && message.body?.[1] === SHORTCUT_ID) {
      showMainWindow()
    }
  }
  bus.connection.on('message', onMessage)
  bus.connection.on('error', error => {
    if (!closed) console.warn('Global shortcut desktop service disconnected:', error)
    close()
  })
  app.once('will-quit', close)
  // Turning the setting off closes the session, which releases the shortcut.
  signal?.addEventListener('abort', close)
  if (signal?.aborted) close()

  const call = (message: Message): Promise<unknown> => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Desktop shortcut service did not respond')), 10000)
    bus.invoke(message, (error, result) => {
      clearTimeout(timeout)
      if (error) reject(error)
      else resolve(result)
    })
  })
  const portalCall = (iface: string, member: string, signature: string, body: unknown[]) =>
    call({destination: PORTAL, path: ROOT, interface: iface, member, signature, body})
  const request = async (member: string, signature: string, body: unknown[], options: unknown[] = []) => {
    const token = 'countdown_' + randomUUID().replace(/-/g, '')
    const requestPath = `${ROOT}/request/${bus.name.slice(1).replace(/\./g, '_')}/${token}`
    // Subscribe before calling: a saved grant may respond immediately.
    const response = new Promise<Values>((resolve, reject) => pending.set(requestPath, {resolve, reject}))
    // Attach the rejection handler before invoking the asynchronous method.
    const result = Promise.all([response, portalCall(SHORTCUTS, member, signature,
      [...body, [...options, ['handle_token', ['s', token]]]])])
    try {return (await result)[0]}
    finally {pending.delete(requestPath)}
  }

  try {
    // Associate this D-Bus connection with the installed desktop entry. Older
    // portals without Registry still support the shortcut protocol.
    try {await portalCall('org.freedesktop.host.portal.Registry', 'Register', 'sa{sv}', ['countdown', []])}
    catch (error) {
      if (!['org.freedesktop.DBus.Error.UnknownMethod', 'org.freedesktop.DBus.Error.UnknownInterface'].includes(error.name)) throw error
    }
    owner = await call({destination: 'org.freedesktop.DBus', path: '/org/freedesktop/DBus',
      interface: 'org.freedesktop.DBus', member: 'GetNameOwner', signature: 's', body: [PORTAL]}) as string
    await call({destination: 'org.freedesktop.DBus', path: '/org/freedesktop/DBus', interface: 'org.freedesktop.DBus',
      member: 'AddMatch', signature: 's', body: [`type='signal',sender='${owner}',path_namespace='${ROOT}'`]})
    const created = await request('CreateSession', 'a{sv}', [], [
      ['session_handle_token', ['s', 'countdown_' + randomUUID().replace(/-/g, '')]],
    ])
    session = value(created, 'session_handle') as string
    if (!session?.startsWith(`${ROOT}/session/`)) throw new Error('Invalid desktop shortcut session')
    const listed = await request('ListShortcuts', 'oa{sv}', [session])
    const shortcuts = value(listed, 'shortcuts') as [string, unknown][]
    if (!shortcuts?.some(shortcut => shortcut[0] === SHORTCUT_ID)) {
      await request('BindShortcuts', 'oa(sa{sv})sa{sv}', [session, [[SHORTCUT_ID, [
        ['description', ['s', 'Show main window']], ['preferred_trigger', ['s', 'CTRL+SHIFT+m']],
      ]]], ''])
    }
    return !closed
  } catch (error) {
    if (!closed) console.warn('Could not enable the global Show main window shortcut:', error)
    close()
    return false
  }
}
