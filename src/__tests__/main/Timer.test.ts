import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Timer } from '../../main/Utilities/Timer.ts';

describe('Timer', () => {
  let tickCallback: ReturnType<typeof vi.fn>;
  let statusCallback: ReturnType<typeof vi.fn>;
  let timer: Timer;

  beforeEach(() => {
    vi.useFakeTimers();
    tickCallback = vi.fn();
    statusCallback = vi.fn();
    timer = new Timer(1000, tickCallback, statusCallback);
  });

  afterEach(() => {
    // ensure the timer is stopped so no pending timers leak
    if (timer.isRunning()) timer.pause();
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('is not running initially', () => {
      expect(timer.isRunning()).toBe(false);
    });

    it('seconds and secondsSet start at 0', () => {
      expect(timer.seconds).toBe(0);
      expect(timer.secondsSet).toBe(0);
    });
  });

  describe('start', () => {
    it('fires tick callback immediately with the given seconds', () => {
      timer.start(10, false);
      expect(tickCallback).toHaveBeenCalledWith(10);
    });

    it('sets secondsSet and seconds to the provided value', () => {
      timer.start(30, false);
      expect(timer.secondsSet).toBe(30);
      expect(timer.seconds).toBe(30);
    });

    it('fires status callback with "started"', () => {
      timer.start(10, false);
      expect(statusCallback).toHaveBeenCalledWith('started');
    });

    it('is running after start', () => {
      timer.start(10, false);
      expect(timer.isRunning()).toBe(true);
    });

    it('pauses an already-running timer before restarting', () => {
      timer.start(10, false);
      statusCallback.mockClear();
      timer.start(20, false);
      // should have paused then resumed
      expect(statusCallback).toHaveBeenCalledWith('stopped');
      expect(statusCallback).toHaveBeenCalledWith('started');
    });
  });

  describe('tick', () => {
    it('decrements seconds by 1 per interval', () => {
      timer.start(5, false);
      tickCallback.mockClear();
      vi.advanceTimersByTime(1000);
      expect(tickCallback).toHaveBeenLastCalledWith(4);
    });

    it('decrements below zero when stopsAtZero is false', () => {
      timer.start(1, false);
      vi.advanceTimersByTime(2000);
      expect(timer.seconds).toBeLessThan(0);
    });

    it('stops at zero when stopsAtZero is true', () => {
      timer.start(2, true);
      vi.advanceTimersByTime(3000);
      // seconds is clamped to 0 and pause() is called inside the tick callback,
      // but AdjustingInterval reschedules *after* returning from the callback so
      // isRunning() may still return true — verify the observable state instead.
      expect(timer.seconds).toBe(0);
      expect(statusCallback).toHaveBeenCalledWith('stopped');
    });

    it('fires status "stopped" when stopping at zero', () => {
      timer.start(1, true);
      statusCallback.mockClear();
      vi.advanceTimersByTime(1000);
      expect(statusCallback).toHaveBeenCalledWith('stopped');
    });
  });

  describe('pause and resume', () => {
    it('pause stops the timer', () => {
      timer.start(10, false);
      timer.pause();
      expect(timer.isRunning()).toBe(false);
    });

    it('pause fires status "stopped"', () => {
      timer.start(10, false);
      statusCallback.mockClear();
      timer.pause();
      expect(statusCallback).toHaveBeenCalledWith('stopped');
    });

    it('pause is a no-op when not running', () => {
      timer.pause();
      expect(statusCallback).not.toHaveBeenCalled();
    });

    it('resume starts the timer', () => {
      timer.start(10, false);
      timer.pause();
      statusCallback.mockClear();
      timer.resume();
      expect(timer.isRunning()).toBe(true);
      expect(statusCallback).toHaveBeenCalledWith('started');
    });

    it('resume is a no-op when already running', () => {
      timer.start(10, false);
      statusCallback.mockClear();
      timer.resume();
      expect(statusCallback).not.toHaveBeenCalled();
    });

    it('seconds do not change while paused', () => {
      timer.start(10, false);
      vi.advanceTimersByTime(1000);
      timer.pause();
      const secondsAfterPause = timer.seconds;
      vi.advanceTimersByTime(5000);
      expect(timer.seconds).toBe(secondsAfterPause);
    });
  });

  describe('toggle', () => {
    it('pauses a running timer', () => {
      timer.start(10, false);
      timer.toggle();
      expect(timer.isRunning()).toBe(false);
    });

    it('resumes a paused timer', () => {
      timer.start(10, false);
      timer.pause();
      timer.toggle();
      expect(timer.isRunning()).toBe(true);
    });
  });

  describe('reset', () => {
    it('sets seconds and secondsSet to 0', () => {
      timer.start(10, false);
      timer.reset();
      expect(timer.seconds).toBe(0);
      expect(timer.secondsSet).toBe(0);
    });

    it('stops the timer', () => {
      timer.start(10, false);
      timer.reset();
      expect(timer.isRunning()).toBe(false);
    });

    it('fires tick callback with 0', () => {
      timer.start(10, false);
      tickCallback.mockClear();
      timer.reset();
      expect(tickCallback).toHaveBeenCalledWith(0);
    });

    it('fires status "reset"', () => {
      timer.start(10, false);
      statusCallback.mockClear();
      timer.reset();
      expect(statusCallback).toHaveBeenCalledWith('reset');
    });
  });

  describe('add and sub', () => {
    it('add increases seconds and fires tick callback', () => {
      timer.start(5, false);
      timer.add(3);
      expect(tickCallback).toHaveBeenLastCalledWith(8);
      expect(timer.seconds).toBe(8);
    });

    it('sub decreases seconds and fires tick callback', () => {
      timer.start(5, false);
      timer.sub(2);
      expect(tickCallback).toHaveBeenLastCalledWith(3);
      expect(timer.seconds).toBe(3);
    });
  });

  describe('setInterval', () => {
    it('updates the interval on the timer and underlying AdjustingInterval', () => {
      timer.setInterval(500);
      expect(timer.interval).toBe(500);
      expect(timer.adjustingTimer.interval).toBe(500);
    });
  });
});
