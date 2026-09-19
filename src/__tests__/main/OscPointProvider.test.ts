import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OscPointProvider } from '../../main/Playback/providers/oscpoint/OscPointProvider.ts';
import { OscListener, OscMessage, OscSocketPool } from '../../main/Playback/osc/OscSocketPool.ts';
import { DEFAULT_OSCPOINT_CONFIG, PlaybackState } from '../../common/playback.ts';

class FakeListener implements OscListener {
  closed = 0;
  private _message: ((message: OscMessage) => void) | null = null;
  private _bundle: ((bundle: unknown) => void) | null = null;

  on(event: 'message' | 'bundle' | 'error', callback: (value: never) => void) {
    if (event === 'message') this._message = callback as never;
    if (event === 'bundle') this._bundle = callback as never;
  }

  send() { /* OSCPoint never asks anything */ }
  close() { this.closed += 1 }

  emit(address: string, ...args: unknown[]) {
    this._message?.([address, ...args]);
  }

  emitBundle(...messages: OscMessage[]) {
    this._bundle?.({timetag: [0, 0], elements: messages});
  }
}

describe('OscPointProvider', () => {
  let states: (PlaybackState | null)[];
  let listeners: FakeListener[];
  let now: number;
  let provider: OscPointProvider;
  let pool: OscSocketPool;

  beforeEach(() => {
    vi.useFakeTimers();
    states = [];
    listeners = [];
    now = 1000;

    pool = new OscSocketPool((port, onListening) => {
      void port;
      const listener = new FakeListener();
      listeners.push(listener);
      onListening();
      return listener;
    });

    provider = new OscPointProvider(
      {onState: (state) => { states.push(state) }, onStatus: () => {}, now: () => now},
      pool,
    );
  });

  afterEach(() => {
    provider.stop();
    vi.useRealTimers();
  });

  function enable(overrides = {}) {
    provider.applyConfig({...DEFAULT_OSCPOINT_CONFIG, enabled: true, ...overrides});
  }

  function lastState() {
    return states[states.length - 1];
  }

  function playing(remaining: number, duration: number) {
    listeners[0].emit('/oscpoint/presentation/name', 'Keynote.pptx');
    listeners[0].emit('/oscpoint/slideshow/currentslide', 4);
    listeners[0].emit('/oscpoint/slideshow/media/state', 'playing');
    listeners[0].emit('/oscpoint/slideshow/media/duration', duration);
    listeners[0].emit('/oscpoint/slideshow/media/remaining', remaining);
  }

  it('listens on OSCPoint default feedback port', () => {
    enable();
    expect(pool.subscriberCount(35550)).toBe(1);
    expect(provider.status().connected).toBe(true);
  });

  it('binds nothing while disabled', () => {
    provider.applyConfig({...DEFAULT_OSCPOINT_CONFIG, enabled: false});
    expect(listeners).toHaveLength(0);
  });

  it('mirrors the media on the current slide', () => {
    enable();
    playing(48_000, 60_000);
    vi.advanceTimersByTime(250);

    expect(lastState()).toMatchObject({title: 'Keynote.pptx — slide 4', remainingSeconds: 48, totalSeconds: 60, isRunning: true});
  });

  it('reads feedback that arrives inside a bundle', () => {
    enable();
    listeners[0].emitBundle(
      ['/oscpoint/slideshow/media/state', 'playing'],
      ['/oscpoint/slideshow/media/duration', 30_000],
      ['/oscpoint/slideshow/media/remaining', 10_000],
    );
    vi.advanceTimersByTime(250);

    expect(lastState()).toMatchObject({remainingSeconds: 10, totalSeconds: 30});
  });

  it('keeps republishing so paused media is not expired', () => {
    enable();
    playing(48_000, 60_000);
    listeners[0].emit('/oscpoint/slideshow/media/state', 'paused');
    vi.advanceTimersByTime(250);
    const published = states.length;

    now += 10_000;
    vi.advanceTimersByTime(1000);

    expect(states.length).toBeGreaterThan(published);
    expect(lastState()).toMatchObject({remainingSeconds: 48, isRunning: false});
  });

  it('releases the timers when the media stops', () => {
    enable();
    playing(48_000, 60_000);
    vi.advanceTimersByTime(250);

    listeners[0].emit('/oscpoint/slideshow/media/state', 'stopped');
    vi.advanceTimersByTime(250);

    expect(lastState()).toBeNull();
  });

  it('releases the timers when playing media goes silent', () => {
    enable({playingTimeout: 2000});
    playing(48_000, 60_000);
    vi.advanceTimersByTime(250);
    expect(lastState()).not.toBeNull();

    now += 3000;
    vi.advanceTimersByTime(250);

    expect(lastState()).toBeNull();
  });

  it('rebinds when the port changes', () => {
    enable({port: 35550});
    enable({port: 35551});

    expect(listeners).toHaveLength(2);
    expect(pool.subscriberCount(35550)).toBe(0);
    expect(pool.subscriberCount(35551)).toBe(1);
  });

  it('does not rebind on an unrelated save', () => {
    enable({port: 35550});
    enable({port: 35550});

    expect(listeners).toHaveLength(1);
    expect(listeners[0].closed).toBe(0);
  });

  it('forgets the deck once disabled', () => {
    enable();
    playing(48_000, 60_000);
    vi.advanceTimersByTime(250);

    provider.applyConfig({...DEFAULT_OSCPOINT_CONFIG, enabled: false});
    enable();
    vi.advanceTimersByTime(250);

    expect(lastState()).toBeNull();
  });

  it('reports the deck as the active title', () => {
    enable();
    playing(48_000, 60_000);
    vi.advanceTimersByTime(250);

    expect(provider.status().activeTitle).toBe('Keynote.pptx — slide 4');
  });
});
