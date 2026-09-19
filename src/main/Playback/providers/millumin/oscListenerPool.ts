import {Server} from "node-osc";
import type {OscMessage} from "./milluminOsc.ts";

export interface OscListener {
  on(event: 'message', callback: (message: OscMessage) => void): void
  on(event: 'bundle', callback: (bundle: unknown) => void): void
  on(event: 'error', callback: (error: Error) => void): void
  close(): void
}

export type OscListenerFactory = (port: number, onListening: () => void) => OscListener

/** What one subscriber gets back: the same events, plus a way to let go of the socket. */
export interface OscSubscription {
  onMessage(callback: (message: OscMessage) => void): void
  onBundle(callback: (bundle: unknown) => void): void
  onError(callback: (error: Error) => void): void
  onListening(callback: () => void): void
  release(): void
}

interface PooledListener {
  listener: OscListener
  listening: boolean
  error: Error | null
  subscribers: Set<Subscriber>
}

interface Subscriber {
  message: ((message: OscMessage) => void) | null
  bundle: ((bundle: unknown) => void) | null
  error: ((error: Error) => void) | null
  listening: (() => void) | null
}

export const defaultOscListenerFactory: OscListenerFactory = (port, onListening) => {
  return new Server(port, '0.0.0.0', onListening) as unknown as OscListener
}

/**
 * One UDP socket per port, shared by every source listening on it.
 *
 * Millumin sends all of its feedback to a single port, so two sources watching two layers of the
 * same machine are both fed by one socket. Binding twice would not just be wasteful: node-osc
 * opens its sockets with reuseAddr, so a second bind on the same port can split the incoming
 * packets between the two listeners instead of failing outright.
 */
export class OscListenerPool {
  private _byPort = new Map<number, PooledListener>()
  private _factory: OscListenerFactory

  constructor(factory: OscListenerFactory = defaultOscListenerFactory) {
    this._factory = factory
  }

  subscribe(port: number): OscSubscription {
    const subscriber: Subscriber = {message: null, bundle: null, error: null, listening: null}
    const pooled = this._acquire(port)
    pooled.subscribers.add(subscriber)

    return {
      onMessage: (callback) => { subscriber.message = callback },
      onBundle: (callback) => { subscriber.bundle = callback },
      onError: (callback) => {
        subscriber.error = callback
        // A socket that already failed has no further error to emit, so replay it
        if (pooled.error) callback(pooled.error)
      },
      onListening: (callback) => {
        subscriber.listening = callback
        // Likewise, a socket bound before this subscriber arrived will not announce itself again
        if (pooled.listening) callback()
      },
      release: () => {
        pooled.subscribers.delete(subscriber)
        if (pooled.subscribers.size > 0) return
        this._byPort.delete(port)
        try {
          pooled.listener.close()
        } catch {
          // An unbound socket throws on close; nothing depends on it having succeeded
        }
      },
    }
  }

  /** How many sources are sharing the socket on a port, for tests and diagnostics. */
  subscriberCount(port: number) {
    return this._byPort.get(port)?.subscribers.size ?? 0
  }

  private _acquire(port: number): PooledListener {
    const existing = this._byPort.get(port)
    if (existing) return existing

    const pooled: PooledListener = {
      listener: null,
      listening: false,
      error: null,
      subscribers: new Set<Subscriber>(),
    }
    this._byPort.set(port, pooled)

    try {
      pooled.listener = this._factory(port, () => {
        pooled.listening = true
        pooled.subscribers.forEach(subscriber => subscriber.listening?.())
      })
    } catch (error) {
      pooled.error = error instanceof Error ? error : new Error(String(error))
      // Reported through the subscription, so a failure to bind reaches every source on this port
      queueMicrotask(() => pooled.subscribers.forEach(subscriber => subscriber.error?.(pooled.error)))
      return pooled
    }

    pooled.listener.on('message', (message) => {
      pooled.subscribers.forEach(subscriber => subscriber.message?.(message))
    })
    pooled.listener.on('bundle', (bundle) => {
      pooled.subscribers.forEach(subscriber => subscriber.bundle?.(bundle))
    })
    pooled.listener.on('error', (error) => {
      pooled.listening = false
      pooled.error = error
      pooled.subscribers.forEach(subscriber => subscriber.error?.(error))
    })

    return pooled
  }
}

// One pool for the whole app: sources are built independently but must share their sockets
export const oscListenerPool = new OscListenerPool()
