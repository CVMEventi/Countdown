import {beforeEach, describe, expect, it, vi} from 'vitest';

// The transport is peerjs's problem; everything below exercises our protocol on top of it
interface FakePeerType {
  id: string
  options: unknown
  destroyed: boolean
  on(event: string, handler: (...args: unknown[]) => void): void
  emit(event: string, ...args: unknown[]): void
  destroy(): void
}

// Hoisted because vi.mock runs before the module body
const {FakePeer, peers} = vi.hoisted(() => {
  const peers: FakePeerType[] = [];

  class FakePeer implements FakePeerType {
    handlers = new Map<string, ((...args: unknown[]) => void)[]>();
    destroyed = false;

    constructor(public id: string, public options: unknown) {
      peers.push(this);
    }

    on(event: string, handler: (...args: unknown[]) => void) {
      const list = this.handlers.get(event) ?? [];
      list.push(handler);
      this.handlers.set(event, list);
    }

    emit(event: string, ...args: unknown[]) {
      (this.handlers.get(event) ?? []).forEach(handler => handler(...args));
    }

    destroy() {
      this.destroyed = true;
    }
  }

  return {FakePeer, peers: peers as FakePeerType[]};
});

vi.mock('peerjs', () => ({Peer: FakePeer}));

import {PeerHost} from '../../renderer/webrtc/PeerHost.ts';
import {PROTOCOL_VERSION} from '../../common/protocol.ts';

class FakeConnection {
  open = true;
  sent: {type: string, update: unknown}[] = [];
  closed = false;
  dataChannel = {bufferedAmount: 0};
  private handlers = new Map<string, ((...args: unknown[]) => void)[]>();

  on(event: string, handler: (...args: unknown[]) => void) {
    const list = this.handlers.get(event) ?? [];
    list.push(handler);
    this.handlers.set(event, list);
  }

  emit(event: string, ...args: unknown[]) {
    (this.handlers.get(event) ?? []).forEach(handler => handler(...args));
  }

  send(data: unknown) {
    this.sent.push(data as {type: string, update: unknown});
  }

  close() {
    this.closed = true;
    this.open = false;
  }

  framesOfType(type: string) {
    return this.sent.filter(frame => frame.type === type);
  }
}

const SESSION = {sessionId: 'AAAAAAAA', controlKey: 'BBBBBBBB', viewKey: 'CCCCCCCC'};

const SNAPSHOT = {timers: {}, timerEngine: {}, messages: {}, playingTimerIds: [] as string[]};

function makeHost(overrides: Record<string, unknown> = {}) {
  const onCommand = vi.fn(async () => ({ok: true}));
  const onClients = vi.fn();
  const onStatus = vi.fn();
  const onApprovalRequest = vi.fn(async () => true);

  const host = new PeerHost({
    session: SESSION,
    signaling: {host: '', port: null, path: '/', key: 'peerjs', secure: true},
    iceServers: [],
    iceTransportPolicy: 'all',
    onStatus,
    onClients,
    onCommand,
    getSnapshot: async () => SNAPSHOT,
    getAudio: vi.fn(async () => ({revision: 'r1', mimeType: 'audio/mpeg', size: 6, data: 'YWJjZGVm'})),
    requireApproval: false,
    onApprovalRequest,
    ...overrides,
  } as never);

  host.start();
  const peer = peers[peers.length - 1];
  return {host, peer, onCommand, onClients, onStatus, onApprovalRequest};
}

function hello(key: string, clientId = 'client-1') {
  return {type: 'hello', update: {protocolVersion: PROTOCOL_VERSION, clientId, key, clientName: 'iPhone'}};
}

async function connect(peer: FakePeerType, frame: unknown = hello(SESSION.controlKey)) {
  const connection = new FakeConnection();
  peer.emit('connection', connection);
  connection.emit('data', frame);
  await vi.waitFor(() => {
    if (!connection.sent.length && !connection.closed) throw new Error('nothing yet');
  });
  return connection;
}

describe('PeerHost', () => {
  beforeEach(() => {
    peers.length = 0;
    vi.clearAllMocks();
  });

  describe('registration', () => {
    it('registers under the peer id derived from the session id', () => {
      const {peer} = makeHost();
      expect(peer.id).toBe('cvm-countdown-aaaaaaaa');
    });

    it('never puts a key in the peer id', () => {
      const {peer} = makeHost();
      expect(peer.id).not.toContain('bbbbbbbb');
      expect(peer.id).not.toContain('cccccccc');
    });

    it('reports online once the broker opens', () => {
      const {peer, onStatus} = makeHost();
      peer.emit('open');
      expect(onStatus).toHaveBeenCalledWith('online', null);
    });

    // Signaling is only needed to create connections, so a broker blip must not read as fatal
    it('treats a transient broker error as signaling, not failure', () => {
      const {peer, onStatus} = makeHost();
      peer.emit('error', Object.assign(new Error('network'), {type: 'network'}));
      expect(onStatus).toHaveBeenCalledWith('signaling', 'network');
    });

    it('treats a taken id as fatal', () => {
      const {peer, onStatus} = makeHost();
      peer.emit('error', Object.assign(new Error('taken'), {type: 'unavailable-id'}));
      expect(onStatus).toHaveBeenCalledWith('failed', 'taken');
    });
  });

  describe('handshake', () => {
    it('welcomes a control key with the control role', async () => {
      const {peer} = makeHost();
      const connection = await connect(peer);

      const welcome = connection.framesOfType('welcome')[0];
      expect(welcome.update).toMatchObject({role: 'control', protocolVersion: PROTOCOL_VERSION});
    });

    it('welcomes a view key with the view role', async () => {
      const {peer} = makeHost();
      const connection = await connect(peer, hello(SESSION.viewKey));

      expect(connection.framesOfType('welcome')[0].update).toMatchObject({role: 'view'});
    });

    it('sends a snapshot straight after welcome', async () => {
      const {peer} = makeHost();
      const connection = await connect(peer);

      expect(connection.sent[0].type).toBe('welcome');
      expect(connection.sent[1].type).toBe('snapshot');
      expect(connection.sent[1].update).toEqual(SNAPSHOT);
    });

    it('tells main about the connected client', async () => {
      const {peer, onClients} = makeHost();
      await connect(peer);

      const reported = onClients.mock.lastCall?.[0];
      expect(reported).toEqual([expect.objectContaining({clientId: 'client-1', name: 'iPhone', role: 'control'})]);
    });

    it('rejects a wrong key', async () => {
      const {peer} = makeHost();
      const connection = await connect(peer, hello('WRONGKEY'));

      expect(connection.framesOfType('error')[0].update).toMatchObject({code: 'unauthorised'});
      expect(connection.closed).toBe(true);
    });

    it('rejects an old protocol version', async () => {
      const {peer} = makeHost();
      const connection = await connect(peer, {
        type: 'hello',
        update: {protocolVersion: 0, clientId: 'c', key: SESSION.controlKey},
      });

      expect(connection.framesOfType('error')[0].update).toMatchObject({code: 'unsupported-version'});
    });

    it('rejects a hello with no client id', async () => {
      const {peer} = makeHost();
      const connection = await connect(peer, {
        type: 'hello',
        update: {protocolVersion: PROTOCOL_VERSION, key: SESSION.controlKey},
      });

      expect(connection.framesOfType('error')[0].update).toMatchObject({code: 'unauthorised'});
    });

    it('ignores a frame that is not a frame', async () => {
      const {peer} = makeHost();
      const connection = new FakeConnection();
      peer.emit('connection', connection);
      connection.emit('data', 'garbage');
      connection.emit('data', null);

      expect(connection.sent).toHaveLength(0);
    });
  });

  describe('roles', () => {
    it('runs a command from a control peer', async () => {
      const {peer, onCommand} = makeHost();
      const connection = await connect(peer);
      connection.emit('data', {type: 'command', update: {verb: 'start', timerId: 't1'}});

      await vi.waitFor(() => expect(onCommand).toHaveBeenCalled());
      expect(onCommand).toHaveBeenCalledWith({verb: 'start', timerId: 't1'});
    });

    // The UI hides the buttons, but the host is what actually has to refuse
    it('refuses a command from a view peer', async () => {
      const {peer, onCommand} = makeHost();
      const connection = await connect(peer, hello(SESSION.viewKey));
      connection.emit('data', {type: 'command', update: {verb: 'reset', timerId: 't1'}});

      await vi.waitFor(() => expect(connection.framesOfType('error').length).toBeGreaterThan(0));
      expect(onCommand).not.toHaveBeenCalled();
      expect(connection.framesOfType('error')[0].update).toMatchObject({code: 'unauthorised'});
    });

    it('acks a command that asked for one', async () => {
      const {peer} = makeHost();
      const connection = await connect(peer);
      connection.emit('data', {type: 'command', update: {verb: 'sendMessage', timerId: 't1', message: 'go', id: 'x1'}});

      await vi.waitFor(() => expect(connection.framesOfType('ack').length).toBe(1));
      expect(connection.framesOfType('ack')[0].update).toMatchObject({id: 'x1', ok: true});
    });
  });

  describe('rate limiting', () => {
    it('cuts off a peer that floods commands', async () => {
      const {peer, onCommand} = makeHost();
      const connection = await connect(peer);

      for (let i = 0; i < 60; i++) {
        connection.emit('data', {type: 'command', update: {verb: 'start', timerId: 't1'}});
      }

      await vi.waitFor(() => expect(connection.framesOfType('error').length).toBeGreaterThan(0));
      expect(connection.framesOfType('error')[0].update).toMatchObject({code: 'rate-limited'});
      expect(onCommand.mock.calls.length).toBeLessThanOrEqual(40);
    });
  });

  describe('approval', () => {
    it('does not ask when approval is off', async () => {
      const {peer, onApprovalRequest} = makeHost();
      await connect(peer);
      expect(onApprovalRequest).not.toHaveBeenCalled();
    });

    it('asks before welcoming when approval is on', async () => {
      const {peer, onApprovalRequest} = makeHost({requireApproval: true});
      const connection = await connect(peer);

      expect(onApprovalRequest).toHaveBeenCalledWith('client-1', 'iPhone');
      expect(connection.framesOfType('welcome')).toHaveLength(1);
    });

    it('denies a refused device and sends no snapshot', async () => {
      const {peer} = makeHost({requireApproval: true, onApprovalRequest: vi.fn(async () => false)});
      const connection = await connect(peer);

      expect(connection.framesOfType('welcome')).toHaveLength(0);
      expect(connection.framesOfType('snapshot')).toHaveLength(0);
      expect(connection.framesOfType('error')[0].update).toMatchObject({code: 'unauthorised'});
    });
  });

  describe('broadcast coalescing', () => {
    it('sends a message frame immediately', async () => {
      const {host, peer} = makeHost();
      const connection = await connect(peer);
      connection.sent.length = 0;

      host.broadcast({type: 'message', update: {timerId: 't1', message: 'go'}});
      expect(connection.framesOfType('message')).toHaveLength(1);
    });

    // set() fires on every keystroke, so only the last one is worth sending
    it('collapses a burst of ticks for one timer into the newest', async () => {
      const {host, peer} = makeHost();
      const connection = await connect(peer);
      connection.sent.length = 0;

      host.broadcast({type: 'timerEngine', update: {timerId: 't1', currentTime: 1}});
      host.broadcast({type: 'timerEngine', update: {timerId: 't1', currentTime: 2}});
      host.broadcast({type: 'timerEngine', update: {timerId: 't1', currentTime: 3}});

      await vi.waitFor(() => expect(connection.framesOfType('timerEngine').length).toBeGreaterThan(0));
      const frames = connection.framesOfType('timerEngine');
      expect(frames).toHaveLength(1);
      expect((frames[0].update as {currentTime: number}).currentTime).toBe(3);
    });

    it('keeps timers separate when collapsing', async () => {
      const {host, peer} = makeHost();
      const connection = await connect(peer);
      connection.sent.length = 0;

      host.broadcast({type: 'timerEngine', update: {timerId: 't1', currentTime: 1}});
      host.broadcast({type: 'timerEngine', update: {timerId: 't2', currentTime: 9}});

      await vi.waitFor(() => expect(connection.framesOfType('timerEngine').length).toBe(2));
    });

    it('drops a stale tick when the channel is backed up', async () => {
      const {host, peer} = makeHost();
      const connection = await connect(peer);
      connection.sent.length = 0;
      connection.dataChannel.bufferedAmount = 1024 * 1024;

      host.broadcast({type: 'timerEngine', update: {timerId: 't1', currentTime: 1}});
      await new Promise(resolve => setTimeout(resolve, 5));

      expect(connection.framesOfType('timerEngine')).toHaveLength(0);
    });

    // A missed cue cannot be recovered from a later frame, unlike a tick
    it('still sends audio cues when the channel is backed up', async () => {
      const {host, peer} = makeHost();
      const connection = await connect(peer);
      connection.sent.length = 0;
      connection.dataChannel.bufferedAmount = 1024 * 1024;

      host.broadcast({type: 'audio', update: {timerId: 't1'}});
      host.broadcast({type: 'message', update: {timerId: 't1', message: 'go'}});

      expect(connection.framesOfType('audio')).toHaveLength(1);
      expect(connection.framesOfType('message')).toHaveLength(1);
    });
  });

  describe('audio transfer', () => {
    it('sends meta then chunks on request', async () => {
      const {peer} = makeHost();
      const connection = await connect(peer);
      connection.sent.length = 0;

      connection.emit('data', {type: 'audioRequest', update: {timerId: 't1', haveRevision: null}});
      await vi.waitFor(() => expect(connection.framesOfType('audioChunk').length).toBeGreaterThan(0));

      expect(connection.framesOfType('audioMeta')[0].update).toMatchObject({
        timerId: 't1', revision: 'r1', mimeType: 'audio/mpeg', totalChunks: 1,
      });
      expect(connection.framesOfType('audioChunk')[0].update).toMatchObject({seq: 0, data: 'YWJjZGVm'});
    });

    it('passes the cached revision through so the host can skip resending', async () => {
      const getAudio = vi.fn(async () => ({reason: 'unchanged' as const}));
      const {peer} = makeHost({getAudio});
      const connection = await connect(peer);

      connection.emit('data', {type: 'audioRequest', update: {timerId: 't1', haveRevision: 'r1'}});
      await vi.waitFor(() => expect(getAudio).toHaveBeenCalled());

      expect(getAudio).toHaveBeenCalledWith('t1', 'r1');
    });

    it('reports unchanged without sending bytes', async () => {
      const {peer} = makeHost({getAudio: vi.fn(async () => ({reason: 'unchanged' as const}))});
      const connection = await connect(peer);
      connection.sent.length = 0;

      connection.emit('data', {type: 'audioRequest', update: {timerId: 't1', haveRevision: 'r1'}});
      await vi.waitFor(() => expect(connection.framesOfType('audioUnavailable').length).toBe(1));

      expect(connection.framesOfType('audioUnavailable')[0].update).toMatchObject({reason: 'unchanged'});
      expect(connection.framesOfType('audioChunk')).toHaveLength(0);
    });

    it('reports a timer with no audio', async () => {
      const {peer} = makeHost({getAudio: vi.fn(async () => ({reason: 'none' as const}))});
      const connection = await connect(peer);

      connection.emit('data', {type: 'audioRequest', update: {timerId: 't1'}});
      await vi.waitFor(() => expect(connection.framesOfType('audioUnavailable').length).toBe(1));

      expect(connection.framesOfType('audioUnavailable')[0].update).toMatchObject({reason: 'none'});
    });

    it('splits a large file into chunks', async () => {
      const big = 'A'.repeat(40000);
      const {peer} = makeHost({
        getAudio: vi.fn(async () => ({revision: 'r1', mimeType: 'audio/mpeg', size: 30000, data: big})),
      });
      const connection = await connect(peer);
      connection.sent.length = 0;

      connection.emit('data', {type: 'audioRequest', update: {timerId: 't1'}});
      await vi.waitFor(() => {
        const meta = connection.framesOfType('audioMeta')[0];
        expect(connection.framesOfType('audioChunk').length).toBe((meta.update as {totalChunks: number}).totalChunks);
      });

      const chunks = connection.framesOfType('audioChunk');
      expect(chunks.length).toBeGreaterThan(2);
      expect(chunks.map(c => (c.update as {data: string}).data).join('')).toBe(big);
    });

    // A second request while one is still streaming would interleave two files
    it('ignores a second request while one is in flight', async () => {
      const getAudio = vi.fn(async () => ({revision: 'r1', mimeType: 'audio/mpeg', size: 6, data: 'A'.repeat(40000)}));
      const {peer} = makeHost({getAudio});
      const connection = await connect(peer);

      connection.emit('data', {type: 'audioRequest', update: {timerId: 't1'}});
      connection.emit('data', {type: 'audioRequest', update: {timerId: 't1'}});

      await vi.waitFor(() => expect(getAudio).toHaveBeenCalled());
      expect(getAudio).toHaveBeenCalledTimes(1);
    });

    it('ignores a request with no timer id', async () => {
      const getAudio = vi.fn(async () => ({reason: 'none' as const}));
      const {peer} = makeHost({getAudio});
      const connection = await connect(peer);

      connection.emit('data', {type: 'audioRequest', update: {}});
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(getAudio).not.toHaveBeenCalled();
    });
  });

  describe('revoke', () => {
    it('closes and blocks a revoked client', async () => {
      const {host, peer} = makeHost();
      const connection = await connect(peer);

      host.revoke('client-1');

      expect(connection.framesOfType('error')[0].update).toMatchObject({code: 'revoked'});
      expect(connection.closed).toBe(true);
    });

    it('refuses a revoked client that reconnects', async () => {
      const {host, peer} = makeHost();
      await connect(peer);
      host.revoke('client-1');

      const second = await connect(peer);
      expect(second.framesOfType('welcome')).toHaveLength(0);
      expect(second.framesOfType('error')[0].update).toMatchObject({code: 'unauthorised'});
    });
  });
});
