import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GrandShowProvider, UdpSocket } from '../../main/Playback/providers/grandshow/GrandShowProvider.ts';
import { DEFAULT_GRANDSHOW_CONFIG, PlaybackState } from '../../common/playback.ts';

class FakeSocket implements UdpSocket {
  closed = 0;
  sent: {query: {cmd: string}, port: number, host: string}[] = [];
  private _handlers: {[event: string]: (value?: never) => void} = {};

  on(event: string, callback: (value?: never) => void) {
    this._handlers[event] = callback;
  }

  bind() {
    this._handlers.listening?.();
  }

  send(message: Buffer, port: number, host: string) {
    this.sent.push({query: JSON.parse(message.toString()), port, host});
  }

  close() {
    this.closed += 1;
  }

  reply(text: string) {
    this._handlers.message?.(Buffer.from(text) as never);
  }

  asked(cmd: string) {
    return this.sent.filter(entry => entry.query.cmd === cmd);
  }
}

function time(ms: number) {
  return {H: 0, M: Math.floor(ms / 60_000), S: Math.floor(ms / 1000) % 60, Mi: ms % 1000};
}

function nodesReply(kind: 'playing' | 'pausing', nodes: {row: number, col: number, cur: number, end?: number}[]) {
  return JSON.stringify({
    nodes: nodes.length ? nodes.map(({row, col, cur, end = 60_000}, index) => ({
      nodeId: index + 1,
      nodePosition: {row, col},
      nodeStartTime: time(0),
      nodeEndTime: time(end),
      nodeCurTime: time(cur),
      nodeDurTime: time(end),
      nodeTotalTime: time(end),
    })) : null,
    [`${kind}NodeNumber`]: String(nodes.length),
  });
}

describe('GrandShowProvider', () => {
  let states: (PlaybackState | null)[];
  let sockets: FakeSocket[];
  let now: number;
  let provider: GrandShowProvider;

  beforeEach(() => {
    vi.useFakeTimers();
    states = [];
    sockets = [];
    now = 10_000;

    provider = new GrandShowProvider(
      {onState: (state) => { states.push(state) }, onStatus: () => {}, now: () => now},
      () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
    );
  });

  afterEach(() => {
    provider.stop();
    vi.useRealTimers();
  });

  function enable(overrides = {}) {
    provider.applyConfig({...DEFAULT_GRANDSHOW_CONFIG, enabled: true, ...overrides});
  }

  function lastState() {
    return states[states.length - 1];
  }

  function answer(playing: {row: number, col: number, cur: number, end?: number}[], paused: typeof playing = []) {
    sockets[0].reply(nodesReply('playing', playing));
    sockets[0].reply(nodesReply('pausing', paused));
    sockets[0].reply('{"sevice": "running"}');
    vi.advanceTimersByTime(250);
  }

  it('asks for the playing and paused nodes as soon as it is enabled', () => {
    enable({host: '172.20.10.2'});

    expect(sockets[0].asked('getPlayingNode')).toHaveLength(1);
    expect(sockets[0].asked('getPausingNode')).toHaveLength(1);
    expect(sockets[0].sent[0]).toMatchObject({port: 30303, host: '172.20.10.2'});
  });

  it('binds nothing while disabled', () => {
    provider.applyConfig({...DEFAULT_GRANDSHOW_CONFIG, enabled: false});
    expect(sockets).toHaveLength(0);
  });

  it('mirrors the playing node', () => {
    enable();
    answer([{row: 1, col: 1, cur: 12_000}]);

    expect(lastState()).toMatchObject({title: 'R1C1', remainingSeconds: 48, totalSeconds: 60, isRunning: true});
    expect(provider.status()).toMatchObject({connected: true, activeTitle: 'R1C1'});
  });

  it('holds the time and reports not running when the node is paused', () => {
    enable();
    answer([], [{row: 1, col: 1, cur: 12_000}]);

    expect(lastState()).toMatchObject({remainingSeconds: 48, isRunning: false});
  });

  it('releases the timers when nothing is playing any more', () => {
    enable();
    answer([{row: 1, col: 1, cur: 12_000}]);
    answer([]);

    expect(lastState()).toBeNull();
  });

  it('releases the timers when the clip holds on its last frame', () => {
    enable();
    answer([{row: 1, col: 1, cur: 60_000}]);

    expect(lastState()).toBeNull();
  });

  it('follows only the pinned node', () => {
    enable({node: 'R2C3'});
    answer([{row: 1, col: 1, cur: 1_000}, {row: 2, col: 3, cur: 30_000}]);

    expect(lastState()).toMatchObject({title: 'R2C3', remainingSeconds: 30});
  });

  it('reports a pin it cannot read', () => {
    enable({node: 'intro'});
    answer([{row: 1, col: 1, cur: 1_000}]);

    expect(provider.status().lastError).toMatch(/not a node/);
    expect(lastState()).toBeNull();
  });

  it('reports central control being off', () => {
    enable();
    sockets[0].reply('{"sevice": "stop"}');

    expect(provider.status().lastError).toMatch(/Central control is off/);
    expect(provider.status().connected).toBe(false);
  });

  it('does not surface error replies as a status error', () => {
    enable();
    sockets[0].reply('COMMAND ERROR');

    expect(provider.status().lastError).toBeNull();
  });

  it('is not connected until GrandShow actually answers', () => {
    enable();
    expect(provider.status().connected).toBe(false);
  });

  it('releases the timers when GrandShow stops answering', () => {
    enable();
    answer([{row: 1, col: 1, cur: 12_000}]);

    now += 5000;
    vi.advanceTimersByTime(250);

    expect(lastState()).toBeNull();
    expect(provider.status().connected).toBe(false);
  });

  it('does not restart a healthy poller on an unrelated save', () => {
    enable();
    enable();

    expect(sockets).toHaveLength(1);
  });

  it('opens a new socket when the host changes', () => {
    enable({host: '10.0.0.1'});
    enable({host: '10.0.0.2'});

    expect(sockets).toHaveLength(2);
    expect(sockets[0].closed).toBe(1);
  });

  it('stops asking once disabled', () => {
    enable();
    provider.applyConfig({...DEFAULT_GRANDSHOW_CONFIG, enabled: false});
    const sent = sockets[0].sent.length;

    vi.advanceTimersByTime(2000);

    expect(sockets[0].sent.length).toBe(sent);
    expect(sockets[0].closed).toBe(1);
  });
});
