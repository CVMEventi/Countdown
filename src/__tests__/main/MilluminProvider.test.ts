import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MilluminProvider, OscListener } from '../../main/Playback/providers/millumin/MilluminProvider.ts';
import { DEFAULT_MILLUMIN_CONFIG, PlaybackState } from '../../common/playback.ts';

class FakeListener implements OscListener {
  port: number;
  closed = 0;
  private _message: ((message: [string, ...unknown[]]) => void) | null = null;
  private _bundle: ((bundle: unknown) => void) | null = null;
  private _error: ((error: Error) => void) | null = null;

  constructor(port: number) {
    this.port = port;
  }

  on(event: 'message', callback: (message: [string, ...unknown[]]) => void): void;
  on(event: 'bundle', callback: (bundle: unknown) => void): void;
  on(event: 'error', callback: (error: Error) => void): void;
  on(event: 'message' | 'bundle' | 'error', callback: (...args: never[]) => void) {
    if (event === 'message') this._message = callback as never;
    if (event === 'bundle') this._bundle = callback as never;
    if (event === 'error') this._error = callback as never;
  }

  close() {
    this.closed += 1;
  }

  send(address: string, ...args: unknown[]) {
    this._message?.([address, ...args]);
  }

  // What node-osc hands over when an app packs its feedback into a bundle
  sendBundle(...messages: [string, ...unknown[]][]) {
    this._bundle?.({timetag: [0, 0], elements: messages});
  }

  fail(message: string) {
    this._error?.(new Error(message));
  }
}

describe('MilluminProvider', () => {
  let states: (PlaybackState | null)[];
  let listeners: FakeListener[];
  let now: number;
  let provider: MilluminProvider;

  beforeEach(() => {
    vi.useFakeTimers();
    states = [];
    listeners = [];
    now = 1000;

    provider = new MilluminProvider(
      {
        onState: (state) => { states.push(state) },
        onStatus: () => {},
        now: () => now,
      },
      (port, onListening) => {
        const listener = new FakeListener(port);
        listeners.push(listener);
        onListening();
        return listener;
      },
    );
  });

  afterEach(() => {
    provider.stop();
    vi.useRealTimers();
  });

  function enable(overrides = {}) {
    provider.applyConfig({...DEFAULT_MILLUMIN_CONFIG, enabled: true, ...overrides});
  }

  function lastState() {
    return states[states.length - 1];
  }

  it('binds the configured port when enabled', () => {
    enable({port: 5001});

    expect(listeners).toHaveLength(1);
    expect(listeners[0].port).toBe(5001);
    expect(provider.status().connected).toBe(true);
  });

  it('binds nothing while disabled', () => {
    provider.applyConfig({...DEFAULT_MILLUMIN_CONFIG, enabled: false});
    expect(listeners).toHaveLength(0);
  });

  it('publishes the playing layer on the heartbeat', () => {
    enable();
    listeners[0].send('/millumin/layer:Main/mediaStarted', 0, 'Package.mov', 60);
    listeners[0].send('/millumin/layer:Main/media/time', 15, 60);

    vi.advanceTimersByTime(250);

    expect(lastState()).toMatchObject({title: 'Package.mov', remainingSeconds: 45, totalSeconds: 60, isRunning: true});
  });

  it('keeps republishing so a paused clip is not expired', () => {
    enable();
    listeners[0].send('/millumin/layer:Main/mediaStarted', 0, 'Package.mov', 60);
    listeners[0].send('/millumin/layer:Main/media/time', 15, 60);
    listeners[0].send('/millumin/layer:Main/mediaPaused', 0, 'Package.mov');

    vi.advanceTimersByTime(250);
    const publishes = states.length;

    now += 10_000;
    vi.advanceTimersByTime(1000);

    expect(states.length).toBeGreaterThan(publishes);
    expect(lastState()).toMatchObject({remainingSeconds: 45, isRunning: false});
  });

  it('reads feedback that arrives inside a bundle', () => {
    enable();
    listeners[0].sendBundle(
      ['/millumin/layer:Main/mediaStarted', 0, 'Package.mov', 60],
      ['/millumin/layer:Main/media/time', 15, 60],
    );

    vi.advanceTimersByTime(250);

    expect(lastState()).toMatchObject({title: 'Package.mov', remainingSeconds: 45, isRunning: true});
  });

  it('reads feedback from a nested bundle', () => {
    enable();
    listeners[0].sendBundle(
      ['/millumin/layer:Main/mediaStarted', 0, 'Package.mov', 60],
      {timetag: [0, 0], elements: [['/millumin/layer:Main/media/time', 15, 60]]} as never,
    );

    vi.advanceTimersByTime(250);

    expect(lastState()).toMatchObject({remainingSeconds: 45});
  });

  it('releases the timers when the media stops', () => {
    enable();
    listeners[0].send('/millumin/layer:Main/mediaStarted', 0, 'Package.mov', 60);
    listeners[0].send('/millumin/layer:Main/media/time', 15, 60);
    vi.advanceTimersByTime(250);

    listeners[0].send('/millumin/layer:Main/mediaStopped', 0, 'Package.mov');
    vi.advanceTimersByTime(250);

    expect(lastState()).toBeNull();
  });

  it('releases the timers when a playing layer goes silent', () => {
    enable({playingTimeout: 2000});
    listeners[0].send('/millumin/layer:Main/mediaStarted', 0, 'Package.mov', 60);
    listeners[0].send('/millumin/layer:Main/media/time', 15, 60);
    vi.advanceTimersByTime(250);
    expect(lastState()).not.toBeNull();

    now += 3000;
    vi.advanceTimersByTime(250);

    expect(lastState()).toBeNull();
  });

  it('reports a port that is already taken', () => {
    enable();
    listeners[0].fail('bind EADDRINUSE 0.0.0.0:5001');

    expect(provider.status().connected).toBe(false);
    expect(provider.status().lastError).toBe('bind EADDRINUSE 0.0.0.0:5001');
  });

  it('surfaces a listener that throws on construction', () => {
    const throwing = new MilluminProvider(
      {onState: () => {}, onStatus: () => {}, now: () => now},
      () => { throw new Error('no socket for you') },
    );
    throwing.applyConfig({...DEFAULT_MILLUMIN_CONFIG, enabled: true});

    expect(throwing.status().lastError).toBe('no socket for you');
    expect(throwing.status().connected).toBe(false);
  });

  it('rebinds when the port changes', () => {
    enable({port: 5001});
    enable({port: 5002});

    expect(listeners.map(l => l.port)).toEqual([5001, 5002]);
    expect(listeners[0].closed).toBe(1);
  });

  it('does not rebind on an unrelated save', () => {
    enable({port: 5001});
    enable({port: 5001});

    expect(listeners).toHaveLength(1);
    expect(listeners[0].closed).toBe(0);
  });

  it('closes the socket and stops publishing once disabled', () => {
    enable();
    listeners[0].send('/millumin/layer:Main/mediaStarted', 0, 'Package.mov', 60);
    listeners[0].send('/millumin/layer:Main/media/time', 15, 60);
    vi.advanceTimersByTime(250);

    provider.applyConfig({...DEFAULT_MILLUMIN_CONFIG, enabled: false});
    const publishes = states.length;
    vi.advanceTimersByTime(2000);

    expect(listeners[0].closed).toBe(1);
    expect(states.length).toBe(publishes);
    expect(provider.status().connected).toBe(false);
  });

  it('forgets its layers across a restart', () => {
    enable({port: 5001});
    listeners[0].send('/millumin/layer:Main/mediaStarted', 0, 'Package.mov', 60);
    listeners[0].send('/millumin/layer:Main/media/time', 15, 60);
    vi.advanceTimersByTime(250);

    enable({port: 5002});
    vi.advanceTimersByTime(250);

    expect(lastState()).toBeNull();
  });

  it('reports the playing media as the active title', () => {
    enable();
    listeners[0].send('/millumin/layer:Main/mediaStarted', 0, 'Package.mov', 60);
    listeners[0].send('/millumin/layer:Main/media/time', 15, 60);
    vi.advanceTimersByTime(250);

    expect(provider.status().activeTitle).toBe('Package.mov');
  });
});
