import { describe, it, expect, vi } from 'vitest';
import { OscListener, OscListenerPool } from '../../main/Playback/providers/millumin/oscListenerPool.ts';

class FakeListener implements OscListener {
  closed = 0;
  handlers: Record<string, (value: never) => void> = {};

  on(event: 'message' | 'bundle' | 'error', callback: (value: never) => void) {
    this.handlers[event] = callback;
  }

  close() {
    this.closed += 1;
  }
}

function makePool() {
  const built: {port: number, listener: FakeListener, announce: () => void}[] = [];
  const pool = new OscListenerPool((port, onListening) => {
    const listener = new FakeListener();
    built.push({port, listener, announce: onListening});
    return listener;
  });
  return {pool, built};
}

describe('OscListenerPool', () => {
  it('binds once per port and fans messages out to every subscriber', () => {
    const {pool, built} = makePool();
    const first = vi.fn();
    const second = vi.fn();

    pool.subscribe(5001).onMessage(first);
    pool.subscribe(5001).onMessage(second);

    expect(built).toHaveLength(1);
    built[0].listener.handlers.message(['/a', 1] as never);

    expect(first).toHaveBeenCalledWith(['/a', 1]);
    expect(second).toHaveBeenCalledWith(['/a', 1]);
  });

  it('binds separately for a different port', () => {
    const {pool, built} = makePool();
    pool.subscribe(5001).onMessage(vi.fn());
    pool.subscribe(5002).onMessage(vi.fn());

    expect(built.map(b => b.port)).toEqual([5001, 5002]);
  });

  it('keeps the socket open until the last subscriber lets go', () => {
    const {pool, built} = makePool();
    const a = pool.subscribe(5001);
    const b = pool.subscribe(5001);

    a.release();
    expect(built[0].listener.closed).toBe(0);
    expect(pool.subscriberCount(5001)).toBe(1);

    b.release();
    expect(built[0].listener.closed).toBe(1);
    expect(pool.subscriberCount(5001)).toBe(0);
  });

  it('binds again after the port was fully released', () => {
    const {pool, built} = makePool();
    pool.subscribe(5001).release();
    pool.subscribe(5001).onMessage(vi.fn());

    expect(built).toHaveLength(2);
  });

  it('fans bundles and errors out too', () => {
    const {pool, built} = makePool();
    const bundle = vi.fn();
    const error = vi.fn();
    const subscription = pool.subscribe(5001);
    subscription.onBundle(bundle);
    subscription.onError(error);

    built[0].listener.handlers.bundle({elements: []} as never);
    built[0].listener.handlers.error(new Error('boom') as never);

    expect(bundle).toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(new Error('boom'));
  });

  it('replays the bound state to a subscriber that arrived late', () => {
    const {pool, built} = makePool();
    pool.subscribe(5001);
    built[0].announce();

    // The socket bound before this source existed, so it will never announce itself again
    const listening = vi.fn();
    pool.subscribe(5001).onListening(listening);

    expect(listening).toHaveBeenCalled();
  });

  it('replays a bind failure to a subscriber that arrived late', async () => {
    const pool = new OscListenerPool(() => { throw new Error('EADDRINUSE') });
    const first = vi.fn();
    pool.subscribe(5001).onError(first);
    await Promise.resolve();
    expect(first).toHaveBeenCalled();

    const late = vi.fn();
    pool.subscribe(5001).onError(late);
    expect(late).toHaveBeenCalledWith(new Error('EADDRINUSE'));
  });
});
