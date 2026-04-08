import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TimerEngine } from '../../main/TimerEngine.ts';
import { ColorThreshold } from '../../common/config.ts';

function makeEngine(options: Record<string, unknown> = {}) {
  const onUpdate = vi.fn();
  const onWebSocketUpdate = vi.fn();
  const onMessageUpdate = vi.fn();
  const onPlaySound = vi.fn();

  const engine = new TimerEngine({
    interval: 1000,
    onUpdate,
    onWebSocketUpdate,
    onMessageUpdate,
    onPlaySound,
    options,
  });

  return { engine, onUpdate, onWebSocketUpdate, onMessageUpdate, onPlaySound };
}

describe('TimerEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('isReset() is true', () => {
      const { engine } = makeEngine();
      expect(engine.isReset()).toBe(true);
    });

    it('timerIsRunning is false', () => {
      const { engine } = makeEngine();
      expect(engine.timerIsRunning).toBe(false);
    });

    it('countSeconds() is 0', () => {
      const { engine } = makeEngine();
      expect(engine.countSeconds()).toBe(0);
    });

    it('extraSeconds() is 0', () => {
      const { engine } = makeEngine();
      expect(engine.extraSeconds()).toBe(0);
    });

    it('isCountingUp() is true', () => {
      const { engine } = makeEngine();
      expect(engine.isCountingUp()).toBe(true);
    });

    it('isExpiring() is false', () => {
      const { engine } = makeEngine();
      expect(engine.isExpiring()).toBe(false);
    });

    it('endsAt() is null', () => {
      const { engine } = makeEngine();
      expect(engine.endsAt()).toBeNull();
    });
  });

  describe('set()', () => {
    it('updates totalSeconds', () => {
      const { engine } = makeEngine();
      engine.set(300);
      expect(engine.totalSeconds).toBe(300);
    });

    it('calls onUpdate and onWebSocketUpdate', () => {
      const { engine, onUpdate, onWebSocketUpdate } = makeEngine();
      engine.set(300);
      expect(onUpdate).toHaveBeenCalled();
      expect(onWebSocketUpdate).toHaveBeenCalled();
    });
  });

  describe('jogSet()', () => {
    it('adds to totalSeconds', () => {
      const { engine } = makeEngine();
      engine.set(300);
      engine.jogSet(60);
      expect(engine.totalSeconds).toBe(360);
    });

    it('subtracts from totalSeconds', () => {
      const { engine } = makeEngine();
      engine.set(300);
      engine.jogSet(-60);
      expect(engine.totalSeconds).toBe(240);
    });

    it('does nothing when both totalSeconds and delta are <= 0', () => {
      const { engine, onUpdate } = makeEngine();
      // totalSeconds is 0, seconds is negative/zero — no-op
      engine.jogSet(-60);
      expect(onUpdate).not.toHaveBeenCalled();
      expect(engine.totalSeconds).toBe(0);
    });
  });

  describe('start()', () => {
    it('sets timerIsRunning to true', () => {
      const { engine } = makeEngine();
      engine.set(60);
      engine.start();
      expect(engine.timerIsRunning).toBe(true);
    });

    it('isReset() becomes false', () => {
      const { engine } = makeEngine();
      engine.set(60);
      engine.start();
      expect(engine.isReset()).toBe(false);
    });

    it('countSeconds() returns the set value initially', () => {
      const { engine } = makeEngine();
      engine.set(60);
      engine.start();
      expect(engine.countSeconds()).toBe(60);
    });

    it('decrements countSeconds over time', () => {
      const { engine } = makeEngine();
      engine.set(10);
      engine.start();
      vi.advanceTimersByTime(3000);
      expect(engine.countSeconds()).toBeLessThanOrEqual(7);
    });
  });

  describe('pause() and resume()', () => {
    it('pause() sets timerIsRunning to false', () => {
      const { engine } = makeEngine();
      engine.set(60);
      engine.start();
      engine.pause();
      expect(engine.timerIsRunning).toBe(false);
    });

    it('pause() calls onUpdate and onWebSocketUpdate', () => {
      const { engine, onUpdate, onWebSocketUpdate } = makeEngine();
      engine.set(60);
      engine.start();
      onUpdate.mockClear();
      onWebSocketUpdate.mockClear();
      engine.pause();
      expect(onUpdate).toHaveBeenCalled();
      expect(onWebSocketUpdate).toHaveBeenCalled();
    });

    it('resume() sets timerIsRunning to true', () => {
      const { engine } = makeEngine();
      engine.set(60);
      engine.start();
      engine.pause();
      engine.resume();
      expect(engine.timerIsRunning).toBe(true);
    });

    it('seconds do not change while paused', () => {
      const { engine } = makeEngine();
      engine.set(10);
      engine.start();
      vi.advanceTimersByTime(2000);
      engine.pause();
      const seconds = engine.countSeconds();
      vi.advanceTimersByTime(5000);
      expect(engine.countSeconds()).toBe(seconds);
    });
  });

  describe('startResumePause()', () => {
    it('starts a reset timer', () => {
      const { engine } = makeEngine();
      engine.set(60);
      engine.startResumePause();
      expect(engine.timerIsRunning).toBe(true);
    });

    it('pauses a running timer', () => {
      const { engine } = makeEngine();
      engine.set(60);
      engine.start();
      engine.startResumePause();
      expect(engine.timerIsRunning).toBe(false);
    });

    it('resumes a paused (non-reset) timer', () => {
      const { engine } = makeEngine();
      engine.set(60);
      engine.start();
      engine.pause();
      engine.startResumePause();
      expect(engine.timerIsRunning).toBe(true);
    });
  });

  describe('toggleTimer()', () => {
    it('pauses a running timer', () => {
      const { engine } = makeEngine();
      engine.set(60);
      engine.start();
      engine.toggleTimer();
      expect(engine.timerIsRunning).toBe(false);
    });

    it('resumes a paused timer', () => {
      const { engine } = makeEngine();
      engine.set(60);
      engine.start();
      engine.pause();
      engine.toggleTimer();
      expect(engine.timerIsRunning).toBe(true);
    });
  });

  describe('reset()', () => {
    it('resets timer to initial state', () => {
      const { engine } = makeEngine();
      engine.set(60);
      engine.start();
      engine.reset();
      expect(engine.isReset()).toBe(true);
      expect(engine.timerIsRunning).toBe(false);
    });

    it('totalSeconds stays 0 when started from 0', () => {
      const { engine } = makeEngine();
      engine.start(); // totalSeconds = 0
      engine.reset();
      expect(engine.totalSeconds).toBe(0);
    });
  });

  describe('add() and sub()', () => {
    it('add() increases totalSeconds when stopped', () => {
      const { engine } = makeEngine();
      engine.set(300);
      engine.add(5); // 5 minutes
      expect(engine.totalSeconds).toBe(600);
    });

    it('sub() decreases totalSeconds when stopped', () => {
      const { engine } = makeEngine();
      engine.set(300);
      engine.sub(1); // 1 minute
      expect(engine.totalSeconds).toBe(240);
    });

    it('add() calls onUpdate', () => {
      const { engine, onUpdate } = makeEngine();
      engine.set(300);
      onUpdate.mockClear();
      engine.add(1);
      expect(onUpdate).toHaveBeenCalled();
    });
  });

  describe('jogCurrent()', () => {
    it('does nothing when timer is not running', () => {
      const { engine, onUpdate } = makeEngine();
      engine.set(60);
      onUpdate.mockClear();
      engine.jogCurrent(10);
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('adjusts current seconds when running', () => {
      const { engine } = makeEngine();
      engine.set(60);
      engine.start();
      const before = engine.countSeconds();
      engine.jogCurrent(5);
      expect(engine.countSeconds()).toBe(before + 5);
    });
  });

  describe('isExpiring()', () => {
    it('returns false when reset', () => {
      const { engine } = makeEngine({ colorThresholds: [{ id: '1', type: 'minutes', value: 5, background: '#f00', text: '#fff' } as ColorThreshold] });
      expect(engine.isExpiring()).toBe(false);
    });

    it('returns false when counting up (past zero)', () => {
      const { engine } = makeEngine({ colorThresholds: [{ id: '1', type: 'minutes', value: 5, background: '#f00', text: '#fff' } as ColorThreshold] });
      engine.set(1);
      engine.start();
      vi.advanceTimersByTime(2000); // now counting up
      expect(engine.isExpiring()).toBe(false);
    });

    it('returns true when within a color threshold', () => {
      const threshold: ColorThreshold = { id: '1', type: 'minutes', value: 5, background: '#f00', text: '#fff' };
      const { engine } = makeEngine({ colorThresholds: [threshold] });
      engine.set(120); // 2 minutes — within 5-minute threshold
      engine.start();
      expect(engine.isExpiring()).toBe(true);
    });

    it('returns false when outside all thresholds', () => {
      const threshold: ColorThreshold = { id: '1', type: 'minutes', value: 2, background: '#f00', text: '#fff' };
      const { engine } = makeEngine({ colorThresholds: [threshold] });
      engine.set(600); // 10 minutes — outside 2-minute threshold
      engine.start();
      expect(engine.isExpiring()).toBe(false);
    });
  });

  describe('extraSeconds()', () => {
    it('returns 0 when currentSeconds > 0', () => {
      const { engine } = makeEngine();
      engine.set(60);
      engine.start();
      expect(engine.extraSeconds()).toBe(0);
    });

    it('returns absolute value when currentSeconds < 0', () => {
      const { engine } = makeEngine();
      engine.set(1);
      engine.start();
      vi.advanceTimersByTime(3000); // goes to -2
      expect(engine.extraSeconds()).toBeGreaterThan(0);
    });
  });

  describe('onUpdate payload', () => {
    it('includes expected fields', () => {
      const { engine, onUpdate } = makeEngine();
      engine.set(300);
      engine.start();
      const payload = onUpdate.mock.lastCall?.[0];
      expect(payload).toMatchObject({
        setSeconds: 300,
        isReset: false,
        isRunning: true,
        isCountingUp: false,
      });
    });
  });

  describe('onWebSocketUpdate payload', () => {
    it('state is "Not Running" when reset', () => {
      const { engine, onWebSocketUpdate } = makeEngine();
      engine.set(60);
      const payload = onWebSocketUpdate.mock.lastCall?.[0];
      expect(payload?.state).toBe('Not Running');
    });

    it('state is "Running" when timer is active', () => {
      const { engine, onWebSocketUpdate } = makeEngine();
      engine.set(60);
      engine.start();
      const payload = onWebSocketUpdate.mock.lastCall?.[0];
      expect(payload?.state).toBe('Running');
    });

    it('state is "Paused" when timer is paused', () => {
      const { engine, onWebSocketUpdate } = makeEngine();
      engine.set(60);
      engine.start();
      engine.pause();
      const payload = onWebSocketUpdate.mock.lastCall?.[0];
      expect(payload?.state).toBe('Paused');
    });

    it('state is "Expired" when countdown reaches zero', () => {
      const { engine, onWebSocketUpdate } = makeEngine();
      engine.set(1);
      engine.start();
      vi.advanceTimersByTime(2000);
      const payload = onWebSocketUpdate.mock.lastCall?.[0];
      expect(payload?.state).toBe('Expired');
    });

    it('state is "Expiring" when within a threshold', () => {
      const threshold: ColorThreshold = { id: '1', type: 'minutes', value: 5, background: '#f00', text: '#fff' };
      const { engine, onWebSocketUpdate } = makeEngine({ colorThresholds: [threshold] });
      engine.set(120); // 2 minutes, within 5-min threshold
      engine.start();
      const payload = onWebSocketUpdate.mock.lastCall?.[0];
      expect(payload?.state).toBe('Expiring');
    });

    it('includes formatted time fields', () => {
      const { engine, onWebSocketUpdate } = makeEngine();
      engine.set(3661); // 1h 1m 1s
      const payload = onWebSocketUpdate.mock.lastCall?.[0];
      expect(payload?.setTimeHms).toBe('01:01:01');
      expect(payload?.setTimeH).toBe('01');
      expect(payload?.setTimeM).toBe('01');
      expect(payload?.setTimeS).toBe('01');
    });
  });

  describe('sound playback', () => {
    it('plays sound once when timer expires', () => {
      const { engine, onPlaySound } = makeEngine({
        audioFile: "test.wav"
      });
      engine.set(1);
      engine.start();
      vi.advanceTimersByTime(2000);
      expect(onPlaySound).toHaveBeenCalledTimes(1);
    });

    it('does not play sound again on subsequent ticks', () => {
      const { engine, onPlaySound } = makeEngine({
        audioFile: "test.wav"
      });
      engine.set(1);
      engine.start();
      vi.advanceTimersByTime(5000);
      expect(onPlaySound).toHaveBeenCalledTimes(1);
    });

    it('does not play sound when audioEnabled is false', () => {
      const { engine, onPlaySound } = makeEngine();
      engine.audioEnabled = false;
      engine.set(1);
      engine.start();
      vi.advanceTimersByTime(2000);
      expect(onPlaySound).not.toHaveBeenCalled();
    });

    it('does not play sound when audioFile missing', () => {
      const { engine, onPlaySound } = makeEngine();
      engine.audioEnabled = true;
      engine.set(1);
      engine.start();
      vi.advanceTimersByTime(2000);
      expect(onPlaySound).not.toHaveBeenCalled();
    })
  });

  describe('setMessage()', () => {
    it('calls onMessageUpdate with the provided message', () => {
      const { engine, onMessageUpdate } = makeEngine();
      engine.setMessage('hello');
      expect(onMessageUpdate).toHaveBeenCalledWith({ timerId: '', message: 'hello' });
    });
  });
});
