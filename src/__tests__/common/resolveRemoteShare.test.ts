import {describe, expect, it} from 'vitest';
import {resolveRemoteShare} from '../../common/webrtcStatus.ts';
import type {RemoteShareInput} from '../../common/webrtcStatus.ts';

function input(overrides: Partial<RemoteShareInput> = {}): RemoteShareInput {
  return {
    enabled: true,
    state: 'online',
    code: 'XKTP-9QM2.4FHB-2WRD',
    spaUrl: 'https://site.com/remote',
    rotation: 'manual',
    id: 'view',
    label: 'Remote',
    role: 'view',
    ...overrides,
  };
}

describe('resolveRemoteShare', () => {
  describe('states', () => {
    it('is disabled when the web remote is off', () => {
      const target = resolveRemoteShare(input({enabled: false}));
      expect(target.availability).toBe('disabled');
      expect(target.reason).not.toBe('');
    });

    it('is unconfigured with no remote page address', () => {
      expect(resolveRemoteShare(input({spaUrl: ''})).availability).toBe('unconfigured');
    });

    // A scheme-less address builds a URL that looks fine and goes nowhere
    it('is unconfigured when the address has no scheme', () => {
      expect(resolveRemoteShare(input({spaUrl: 'site.com/remote'})).availability).toBe('unconfigured');
    });

    it('is unconfigured for a non-http scheme', () => {
      expect(resolveRemoteShare(input({spaUrl: 'ftp://site.com'})).availability).toBe('unconfigured');
    });

    it.each([
      ['starting' as const],
      ['signaling' as const],
      ['failed' as const],
      ['disabled' as const],
    ])('is offline while the peer is %s', (state) => {
      expect(resolveRemoteShare(input({state})).availability).toBe('offline');
    });

    it('explains a failure differently from a wait', () => {
      const failed = resolveRemoteShare(input({state: 'failed'}));
      const waiting = resolveRemoteShare(input({state: 'signaling'}));
      expect(failed.reason).not.toBe(waiting.reason);
    });

    it('is offline when online but no code has been issued', () => {
      expect(resolveRemoteShare(input({code: null})).availability).toBe('offline');
    });

    it('is ready when enabled, configured and online', () => {
      expect(resolveRemoteShare(input()).availability).toBe('ready');
    });
  });

  // A dead QR must be unrepresentable, so nothing but ready carries a url
  describe('url', () => {
    it.each([
      ['disabled', {enabled: false}],
      ['unconfigured', {spaUrl: ''}],
      ['scheme-less', {spaUrl: 'site.com'}],
      ['offline', {state: 'signaling' as const}],
      ['codeless', {code: null}],
    ])('is empty when %s', (_label, overrides) => {
      expect(resolveRemoteShare(input(overrides)).url).toBe('');
    });

    it('is the operator link with no timer', () => {
      expect(resolveRemoteShare(input()).url).toBe('https://site.com/remote#/r/XKTP9QM2.4FHB2WRD');
    });

    it('is the window link when a timer and window are given', () => {
      const target = resolveRemoteShare(input({timerId: 't1', windowId: 'w1'}));
      expect(target.url).toBe('https://site.com/remote#/d/XKTP9QM2.4FHB2WRD/t1/w1');
    });
  });

  describe('caution', () => {
    it('warns a view link reaches every timer, not just this one', () => {
      const target = resolveRemoteShare(input({role: 'view', timerId: 't1', windowId: 'w1'}));
      expect(target.caution).toContain('every timer');
    });

    it('warns a control link grants control', () => {
      expect(resolveRemoteShare(input({role: 'control'})).caution).toContain('Full control');
    });

    // A QR taped to a monitor dies on restart when codes rotate per session
    it('warns when the code rotates each session', () => {
      expect(resolveRemoteShare(input({rotation: 'session'})).caution).toContain('restarts');
    });

    it('does not warn about restarts when the code is kept', () => {
      expect(resolveRemoteShare(input({rotation: 'manual'})).caution).not.toContain('restarts');
    });

    it('is absent when there is nothing to share', () => {
      expect(resolveRemoteShare(input({enabled: false})).caution).toBeUndefined();
    });
  });

  it('carries id and label through', () => {
    const target = resolveRemoteShare(input({id: 'control', label: 'Operator'}));
    expect(target.id).toBe('control');
    expect(target.label).toBe('Operator');
  });
});
