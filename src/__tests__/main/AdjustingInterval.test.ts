import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AdjustingInterval from '../../main/Utilities/AdjustingInterval.ts';

describe('AdjustingInterval', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is not running before start', () => {
    const ai = new AdjustingInterval(() => {}, 1000);
    expect(ai.isRunning()).toBe(false);
  });

  it('is running after start', () => {
    const ai = new AdjustingInterval(() => {}, 1000);
    ai.start();
    expect(ai.isRunning()).toBe(true);
    ai.stop();
  });

  it('is not running after stop', () => {
    const ai = new AdjustingInterval(() => {}, 1000);
    ai.start();
    ai.stop();
    expect(ai.isRunning()).toBe(false);
  });

  it('does not call callback before interval elapses', () => {
    const callback = vi.fn();
    const ai = new AdjustingInterval(callback, 1000);
    ai.start();
    vi.advanceTimersByTime(999);
    expect(callback).not.toHaveBeenCalled();
    ai.stop();
  });

  it('calls callback after one interval', () => {
    const callback = vi.fn();
    const ai = new AdjustingInterval(callback, 1000);
    ai.start();
    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);
    ai.stop();
  });

  it('calls callback multiple times over multiple intervals', () => {
    const callback = vi.fn();
    const ai = new AdjustingInterval(callback, 1000);
    ai.start();
    vi.advanceTimersByTime(3000);
    expect(callback.mock.calls.length).toBeGreaterThanOrEqual(2);
    ai.stop();
  });

  it('does not call callback after stop', () => {
    const callback = vi.fn();
    const ai = new AdjustingInterval(callback, 1000);
    ai.start();
    vi.advanceTimersByTime(1000);
    ai.stop();
    const callsBefore = callback.mock.calls.length;
    vi.advanceTimersByTime(2000);
    expect(callback.mock.calls.length).toBe(callsBefore);
  });

  it('can be restarted after stop', () => {
    const callback = vi.fn();
    const ai = new AdjustingInterval(callback, 1000);
    ai.start();
    vi.advanceTimersByTime(1000);
    ai.stop();
    callback.mockClear();
    ai.start();
    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);
    ai.stop();
  });
});
