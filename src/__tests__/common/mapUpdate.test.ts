import {describe, expect, it} from 'vitest';
import {mapUpdate} from '../../common/mapUpdate.ts';
import type {TimerEngineWebSocketUpdate} from '../../common/TimerInterfaces.ts';

function wire(overrides: Partial<TimerEngineWebSocketUpdate> = {}): TimerEngineWebSocketUpdate {
  return {
    state: 'Running',
    setTime: 60,
    setTimeHms: '00:01:00',
    setTimeMs: '01:00',
    setTimeH: '00',
    setTimeM: '01',
    setTimeS: '00',
    currentTime: 30,
    timeSetOnCurrentTimer: 60,
    timerEndsAt: '12:34',
    ...overrides,
  };
}

describe('mapUpdate', () => {
  describe('state flags', () => {
    it('maps Not Running to reset and stopped', () => {
      const update = mapUpdate(wire({state: 'Not Running'}));
      expect(update.isReset).toBe(true);
      expect(update.isRunning).toBe(false);
      expect(update.isExpiring).toBe(false);
      expect(update.isCountingUp).toBe(false);
    });

    it('maps Paused to neither reset nor running', () => {
      const update = mapUpdate(wire({state: 'Paused'}));
      expect(update.isReset).toBe(false);
      expect(update.isRunning).toBe(false);
    });

    it('maps Running to running only', () => {
      const update = mapUpdate(wire({state: 'Running'}));
      expect(update.isRunning).toBe(true);
      expect(update.isExpiring).toBe(false);
      expect(update.isCountingUp).toBe(false);
    });

    // Expiring and Expired are still running: the clock has not stopped
    it('maps Expiring to running and expiring', () => {
      const update = mapUpdate(wire({state: 'Expiring'}));
      expect(update.isRunning).toBe(true);
      expect(update.isExpiring).toBe(true);
      expect(update.isCountingUp).toBe(false);
    });

    it('maps Expired to running and counting up', () => {
      const update = mapUpdate(wire({state: 'Expired'}));
      expect(update.isRunning).toBe(true);
      expect(update.isCountingUp).toBe(true);
      expect(update.isExpiring).toBe(false);
    });
  });

  describe('time splitting', () => {
    it('puts a positive current time in countSeconds', () => {
      const update = mapUpdate(wire({currentTime: 30}));
      expect(update.currentSeconds).toBe(30);
      expect(update.countSeconds).toBe(30);
      expect(update.extraSeconds).toBe(0);
    });

    // Past zero the display counts up, so the overrun is carried separately and unsigned
    it('puts a negative current time in extraSeconds, unsigned', () => {
      const update = mapUpdate(wire({state: 'Expired', currentTime: -15}));
      expect(update.currentSeconds).toBe(-15);
      expect(update.countSeconds).toBe(0);
      expect(update.extraSeconds).toBe(15);
    });

    it('treats zero as neither counting down nor over', () => {
      const update = mapUpdate(wire({currentTime: 0}));
      expect(update.countSeconds).toBe(0);
      expect(update.extraSeconds).toBe(0);
    });

    it('defaults an absent current time to zero', () => {
      const update = mapUpdate(wire({currentTime: undefined}));
      expect(update.currentSeconds).toBe(0);
    });
  });

  describe('carried fields', () => {
    it('passes the set time through', () => {
      expect(mapUpdate(wire({setTime: 90})).setSeconds).toBe(90);
    });

    it('falls back to the set time when the current timer has none of its own', () => {
      const update = mapUpdate(wire({setTime: 90, timeSetOnCurrentTimer: undefined}));
      expect(update.secondsSetOnCurrentTimer).toBe(90);
    });

    it('prefers the current timer set time when present', () => {
      const update = mapUpdate(wire({setTime: 90, timeSetOnCurrentTimer: 45}));
      expect(update.secondsSetOnCurrentTimer).toBe(45);
    });

    it('passes the end time through', () => {
      expect(mapUpdate(wire({timerEndsAt: '12:34'})).timerEndsAt).toBe('12:34');
    });

    // The wire uses "" rather than null for an absent end time
    it('keeps an empty end time as empty rather than null', () => {
      expect(mapUpdate(wire({timerEndsAt: ''})).timerEndsAt).toBe('');
    });

    it('turns an absent end time into null', () => {
      expect(mapUpdate(wire({timerEndsAt: undefined})).timerEndsAt).toBeNull();
    });
  });
  describe('playback source', () => {
    it('passes the source through', () => {
      expect(mapUpdate(wire({source: 'vmix'})).source).toBe('vmix');
    });

    it('is null when no source is driving the timer', () => {
      expect(mapUpdate(wire({})).source).toBeNull();
    });

    // A clip playing over a reset timer: the display must not fall back to reset colours, but the
    // control UI still has to know the timer itself is reset
    it('keeps the timer own reset state separate from the displayed state', () => {
      const update = mapUpdate(wire({source: 'vmix', state: 'Running', timerState: 'Not Running'}));

      expect(update.isReset).toBe(false);
      expect(update.timerIsReset).toBe(true);
    });

    it('falls back to the displayed state when no timer state is sent', () => {
      expect(mapUpdate(wire({state: 'Not Running'})).timerIsReset).toBe(true);
      expect(mapUpdate(wire({state: 'Running'})).timerIsReset).toBe(false);
    });
  });
});
