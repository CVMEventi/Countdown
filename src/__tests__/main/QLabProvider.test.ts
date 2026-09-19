import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QLabProvider } from '../../main/Playback/providers/qlab/QLabProvider.ts';
import { OscListener, OscMessage, OscSocketPool } from '../../main/Playback/osc/OscSocketPool.ts';
import { DEFAULT_QLAB_CONFIG, PlaybackState } from '../../common/playback.ts';

class FakeListener implements OscListener {
  closed = 0;
  sent: {message: OscMessage, port: number, host: string}[] = [];
  private _message: ((message: OscMessage) => void) | null = null;

  on(event: 'message' | 'bundle' | 'error', callback: (value: never) => void) {
    if (event === 'message') this._message = callback as never;
  }

  send(message: OscMessage, port: number, host: string) {
    this.sent.push({message, port, host});
  }

  close() {
    this.closed += 1;
  }

  // What QLab sends back
  reply(address: string, data: unknown, status = 'ok') {
    this._message?.(['/reply' + address, JSON.stringify({workspace_id: 'ws1', address, status, data})]);
  }

  asked(suffix: string) {
    return this.sent.filter(entry => String(entry.message[0]).includes(suffix));
  }
}

const CUES = [{uniqueID: 'c1', number: '1', name: 'Package', listName: 'Package.mov', type: 'Video'}];
const VALUES = {actionElapsed: 12, currentDuration: 60, isPaused: false, isRunning: true, listName: 'Package.mov'};

describe('QLabProvider', () => {
  let states: (PlaybackState | null)[];
  let listeners: FakeListener[];
  let now: number;
  let provider: QLabProvider;
  let pool: OscSocketPool;

  beforeEach(() => {
    vi.useFakeTimers();
    states = [];
    listeners = [];
    now = 10_000;

    pool = new OscSocketPool((port, onListening) => {
      const listener = new FakeListener();
      listeners.push(listener);
      onListening();
      return listener;
    });

    provider = new QLabProvider(
      {onState: (state) => { states.push(state) }, onStatus: () => {}, now: () => now},
      pool,
    );
  });

  afterEach(() => {
    provider.stop();
    vi.useRealTimers();
  });

  function enable(overrides = {}) {
    provider.applyConfig({...DEFAULT_QLAB_CONFIG, enabled: true, ...overrides});
  }

  function lastState() {
    return states[states.length - 1];
  }

  /** One full round: QLab answers the cue list, then the cue's times on the following poll. */
  function runCycle(cues = CUES, values = VALUES) {
    listeners[0].reply('/runningOrPausedCues', cues);
    vi.advanceTimersByTime(500);
    listeners[0].reply(`/cue_id/${cues[0].uniqueID}/valuesForKeys`, values);
    vi.advanceTimersByTime(500);
  }

  it('asks what is running as soon as it is enabled', () => {
    enable();
    expect(listeners[0].asked('/runningOrPausedCues')).toHaveLength(1);
    expect(listeners[0].sent[0].port).toBe(53000);
    expect(listeners[0].sent[0].host).toBe('127.0.0.1');
  });

  it('asks from the reply port, so answers come back to it', () => {
    enable({replyPort: 53001});
    // The pool is keyed by the local port the socket is bound to
    expect(pool.subscriberCount(53001)).toBe(1);
  });

  it('binds nothing while disabled', () => {
    provider.applyConfig({...DEFAULT_QLAB_CONFIG, enabled: false});
    expect(listeners).toHaveLength(0);
  });

  it('asks a running cue for its times, then mirrors it', () => {
    enable();
    runCycle();

    expect(listeners[0].asked('/cue_id/c1/valuesForKeys').length).toBeGreaterThan(0);
    expect(lastState()).toMatchObject({title: 'Package.mov', remainingSeconds: 48, totalSeconds: 60, isRunning: true});
  });

  it('holds the time and reports not running when the cue is paused', () => {
    enable();
    runCycle(CUES, {...VALUES, isPaused: true});

    expect(lastState()).toMatchObject({remainingSeconds: 48, isRunning: false});
  });

  it('releases the timers when nothing is running any more', () => {
    enable();
    runCycle();
    expect(lastState()).not.toBeNull();

    listeners[0].reply('/runningOrPausedCues', []);
    vi.advanceTimersByTime(500);

    expect(lastState()).toBeNull();
  });

  it('forgets the times of a cue that stopped', () => {
    enable();
    runCycle();

    // A different cue is running now; the old one must not keep driving the timers
    listeners[0].reply('/runningOrPausedCues', [{uniqueID: 'c2', number: '2', name: 'Other', listName: '', type: 'Video'}]);
    vi.advanceTimersByTime(500);

    expect(lastState()).toBeNull();
  });

  it('prefixes the workspace when one is configured', () => {
    enable({workspace: 'ws1'});
    expect(String(listeners[0].sent[0].message[0])).toBe('/workspace/ws1/runningOrPausedCues');
  });

  it('sends the passcode alongside the poll when one is set', () => {
    enable({passcode: 'secret'});
    const connect = listeners[0].asked('/connect');

    expect(connect).toHaveLength(1);
    expect(connect[0].message[1]).toBe('secret');
  });

  it('sends no passcode when none is set', () => {
    enable();
    expect(listeners[0].asked('/connect')).toHaveLength(0);
  });

  it('reports a denied workspace', () => {
    enable({passcode: 'wrong'});
    listeners[0].reply('/runningOrPausedCues', null, 'denied');

    expect(provider.status().lastError).toBe('Denied by QLab — check the workspace passcode');
  });

  it('clears the error once QLab answers properly again', () => {
    enable();
    listeners[0].reply('/runningOrPausedCues', null, 'denied');
    expect(provider.status().lastError).not.toBeNull();

    listeners[0].reply('/runningOrPausedCues', CUES);
    expect(provider.status().lastError).toBeNull();
  });

  it('is not connected until QLab actually answers', () => {
    enable();
    expect(provider.status().connected).toBe(false);

    listeners[0].reply('/runningOrPausedCues', CUES);
    expect(provider.status().connected).toBe(true);
  });

  it('releases the timers when QLab stops answering', () => {
    enable();
    runCycle();
    expect(lastState()).not.toBeNull();

    now += 5000;
    vi.advanceTimersByTime(500);

    expect(lastState()).toBeNull();
    expect(provider.status().connected).toBe(false);
  });

  it('follows only the configured cue when one is pinned', () => {
    enable({cue: '2'});
    const cues = [
      {uniqueID: 'c1', number: '1', name: 'A', listName: 'A.mov', type: 'Video'},
      {uniqueID: 'c2', number: '2', name: 'B', listName: 'B.mov', type: 'Video'},
    ];

    listeners[0].reply('/runningOrPausedCues', cues);
    vi.advanceTimersByTime(500);

    // Only the pinned cue is ever asked about
    expect(listeners[0].asked('/cue_id/c1/')).toHaveLength(0);
    expect(listeners[0].asked('/cue_id/c2/').length).toBeGreaterThan(0);
  });

  it('rebinds when the reply port changes', () => {
    enable({replyPort: 53001});
    enable({replyPort: 53002});

    expect(listeners).toHaveLength(2);
    expect(pool.subscriberCount(53001)).toBe(0);
    expect(pool.subscriberCount(53002)).toBe(1);
  });

  it('does not restart a healthy poller on an unrelated save', () => {
    enable();
    const sent = listeners[0].sent.length;
    enable();

    expect(listeners).toHaveLength(1);
    expect(listeners[0].sent.length).toBe(sent);
  });

  it('stops asking once disabled', () => {
    enable();
    runCycle();
    provider.applyConfig({...DEFAULT_QLAB_CONFIG, enabled: false});
    const sent = listeners[0].sent.length;

    vi.advanceTimersByTime(2000);

    expect(listeners[0].sent.length).toBe(sent);
    expect(listeners[0].closed).toBe(1);
  });
});
