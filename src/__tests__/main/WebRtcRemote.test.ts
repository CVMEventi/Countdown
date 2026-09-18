import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('electron', () => ({BrowserWindow: class {}}));

import {WebRtcRemote} from '../../main/Remotes/WebRtcRemote.ts';
import {DEFAULT_REMOTE_SETTINGS} from '../../common/config.ts';
import {parsePairingCode} from '../../common/protocol.ts';
import type {RemoteSettings} from '../../common/config.ts';

function makeHost() {
  const send = vi.fn();
  const destroy = vi.fn();
  const host = {
    browserWindow: {webContents: {id: 7, send}, isDestroyed: () => false},
    loadPage: vi.fn(async () => {}),
    destroy,
  };
  return {host, send, destroy};
}

function settings(overrides: Partial<RemoteSettings> = {}): RemoteSettings {
  return {...DEFAULT_REMOTE_SETTINGS, webrtcEnabled: true, ...overrides};
}

describe('WebRtcRemote', () => {
  let host: ReturnType<typeof makeHost>;
  let onStatus: ReturnType<typeof vi.fn>;
  let remote: WebRtcRemote;

  beforeEach(() => {
    host = makeHost();
    onStatus = vi.fn();
    remote = new WebRtcRemote(() => host.host as never, onStatus);
  });

  describe('lifecycle', () => {
    it('is not running before it is started', () => {
      expect(remote.isRunning).toBe(false);
      expect(remote.status().state).toBe('disabled');
    });

    it('starts when enabled', async () => {
      await remote.applyState(settings());
      expect(remote.isRunning).toBe(true);
      expect(host.host.loadPage).toHaveBeenCalledWith('/webrtc-host');
    });

    it('does not start when disabled', async () => {
      await remote.applyState(settings({webrtcEnabled: false}));
      expect(remote.isRunning).toBe(false);
      expect(host.host.loadPage).not.toHaveBeenCalled();
    });

    it('stops when the setting is turned off', async () => {
      await remote.applyState(settings());
      await remote.applyState(settings({webrtcEnabled: false}));

      expect(remote.isRunning).toBe(false);
      expect(host.destroy).toHaveBeenCalled();
    });

    // An unrelated settings save must not restart a peer that is already up
    it('does not restart when already running', async () => {
      await remote.applyState(settings());
      await remote.applyState(settings());
      expect(host.host.loadPage).toHaveBeenCalledTimes(1);
    });

    it('exposes the host webContents id for the IPC gate', async () => {
      expect(remote.hostWebContentsId).toBeNull();
      await remote.applyState(settings());
      expect(remote.hostWebContentsId).toBe(7);
    });
  });

  describe('session codes', () => {
    it('generates a session on start', async () => {
      await remote.applyState(settings());
      const session = remote.session;

      expect(session?.sessionId).toHaveLength(8);
      expect(session?.controlKey).toHaveLength(8);
      expect(session?.viewKey).toHaveLength(8);
    });

    it('never issues the same key for control and view', async () => {
      for (let i = 0; i < 25; i++) {
        const fresh = new WebRtcRemote(() => makeHost().host as never, vi.fn());
        await fresh.applyState(settings());
        expect(fresh.session?.controlKey).not.toBe(fresh.session?.viewKey);
      }
    });

    it('publishes codes that parse back to the session', async () => {
      await remote.applyState(settings());
      const status = remote.status();

      expect(parsePairingCode(status.controlCode!)).toEqual({
        sessionId: remote.session!.sessionId,
        key: remote.session!.controlKey,
      });
      expect(parsePairingCode(status.viewCode!)).toEqual({
        sessionId: remote.session!.sessionId,
        key: remote.session!.viewKey,
      });
    });

    it('derives a peer id from the session id only, never the keys', async () => {
      await remote.applyState(settings());
      const {peerId} = remote.status();

      expect(peerId).toContain(remote.session!.sessionId.toLowerCase());
      expect(peerId).not.toContain(remote.session!.controlKey.toLowerCase());
      expect(peerId).not.toContain(remote.session!.viewKey.toLowerCase());
    });

    it('rotates to an entirely new session', async () => {
      await remote.applyState(settings());
      const before = remote.session!;
      remote.rotateCode();
      const after = remote.session!;

      expect(after.sessionId).not.toBe(before.sessionId);
      expect(after.controlKey).not.toBe(before.controlKey);
      expect(after.viewKey).not.toBe(before.viewKey);
    });

    it('tells the host about a rotation', async () => {
      await remote.applyState(settings());
      host.send.mockClear();
      remote.rotateCode();

      expect(host.send).toHaveBeenCalledWith('webrtc-host:session', remote.session);
    });

    it('drops connected clients on rotation', async () => {
      await remote.applyState(settings());
      remote.hostReportedClients([
        {clientId: 'a', name: 'Phone', role: 'control', since: 1, rttMs: 20},
      ]);
      remote.rotateCode();

      expect(remote.status().clients).toEqual([]);
    });

    it('reuses a stored code when rotation is manual', async () => {
      const stored = 'AAAAAAAA.BBBBBBBB.CCCCCCCC';
      await remote.applyState(settings({webrtcCodeRotation: 'manual', webrtcRoomCode: stored}));

      expect(remote.session).toEqual({
        sessionId: 'AAAAAAAA',
        controlKey: 'BBBBBBBB',
        viewKey: 'CCCCCCCC',
      });
    });

    it('generates a fresh code each start when rotation is per session', async () => {
      await remote.applyState(settings({webrtcCodeRotation: 'session'}));
      const first = remote.session!.sessionId;
      await remote.applyState(settings({webrtcEnabled: false}));
      await remote.applyState(settings({webrtcCodeRotation: 'session'}));

      expect(remote.session!.sessionId).not.toBe(first);
    });
  });

  describe('clients', () => {
    it('reports what the host reported', async () => {
      await remote.applyState(settings());
      remote.hostReportedClients([
        {clientId: 'a', name: 'Phone', role: 'control', since: 1, rttMs: 20},
        {clientId: 'b', name: 'Tablet', role: 'view', since: 2, rttMs: null},
      ]);

      expect(remote.status().clients).toHaveLength(2);
    });

    it('revoking removes the client and tells the host', async () => {
      await remote.applyState(settings());
      remote.hostReportedClients([
        {clientId: 'a', name: 'Phone', role: 'control', since: 1, rttMs: 20},
      ]);
      remote.revoke('a');

      expect(remote.status().clients).toEqual([]);
      expect(host.send).toHaveBeenCalledWith('webrtc-host:revoke', 'a');
      expect(remote.isBlocked('a')).toBe(true);
    });

    it('forgets the blocklist on a fresh start', async () => {
      await remote.applyState(settings());
      remote.revoke('a');
      await remote.applyState(settings({webrtcEnabled: false}));
      await remote.applyState(settings());

      expect(remote.isBlocked('a')).toBe(false);
    });
  });

  describe('device approval', () => {
    it('allows without asking when approval is off', async () => {
      const ask = vi.fn(async () => true);
      const fresh = new WebRtcRemote(() => makeHost().host as never, vi.fn(), ask);
      await fresh.applyState(settings());

      // requestApproval is only called by the host when the setting is on, but when it is
      // called it must consult the prompt
      expect(await fresh.requestApproval('a', 'iPhone')).toBe(true);
      expect(ask).toHaveBeenCalledWith('iPhone');
    });

    it('remembers an approved device so it is asked once', async () => {
      const ask = vi.fn(async () => true);
      const fresh = new WebRtcRemote(() => makeHost().host as never, vi.fn(), ask);
      await fresh.applyState(settings());

      await fresh.requestApproval('a', 'iPhone');
      await fresh.requestApproval('a', 'iPhone');

      expect(ask).toHaveBeenCalledTimes(1);
      expect(fresh.isApproved('a')).toBe(true);
    });

    it('blocks a denied device so it cannot keep prompting', async () => {
      const ask = vi.fn(async () => false);
      const fresh = new WebRtcRemote(() => makeHost().host as never, vi.fn(), ask);
      await fresh.applyState(settings());

      expect(await fresh.requestApproval('a', 'iPhone')).toBe(false);
      expect(await fresh.requestApproval('a', 'iPhone')).toBe(false);

      expect(ask).toHaveBeenCalledTimes(1);
      expect(fresh.isBlocked('a')).toBe(true);
    });

    it('never prompts for a revoked device', async () => {
      const ask = vi.fn(async () => true);
      const fresh = new WebRtcRemote(() => makeHost().host as never, vi.fn(), ask);
      await fresh.applyState(settings());
      fresh.revoke('a');

      expect(await fresh.requestApproval('a', 'iPhone')).toBe(false);
      expect(ask).not.toHaveBeenCalled();
    });

    it('forgets approvals on a fresh start', async () => {
      const ask = vi.fn(async () => true);
      const fresh = new WebRtcRemote(() => makeHost().host as never, vi.fn(), ask);
      await fresh.applyState(settings());
      await fresh.requestApproval('a', 'iPhone');

      await fresh.applyState(settings({webrtcEnabled: false}));
      await fresh.applyState(settings());

      expect(fresh.isApproved('a')).toBe(false);
    });
  });

  describe('transport', () => {
    it('forwards broadcasts to the host', async () => {
      await remote.applyState(settings());
      const update = {type: 'audio' as const, update: {timerId: 'timer1'}};
      remote.sendToClients(update);

      expect(host.send).toHaveBeenCalledWith('webrtc-host:broadcast', update);
    });

    // The orchestrator broadcasts on every tick, including while the peer is off
    it('silently drops a broadcast when not running', () => {
      expect(() => remote.sendToClients({type: 'audio', update: {timerId: 'timer1'}})).not.toThrow();
      expect(host.send).not.toHaveBeenCalled();
    });
  });

  describe('status reporting', () => {
    it('reflects what the host reports', async () => {
      await remote.applyState(settings());
      remote.hostReportedStatus('online', null);
      expect(remote.status().state).toBe('online');

      remote.hostReportedStatus('failed', 'broker down');
      expect(remote.status().state).toBe('failed');
      expect(remote.status().lastError).toBe('broker down');
    });

    it('notifies on every change', async () => {
      await remote.applyState(settings());
      onStatus.mockClear();
      remote.hostReportedStatus('online', null);

      expect(onStatus).toHaveBeenCalledWith(expect.objectContaining({state: 'online'}));
    });
  });
});
