import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PreciseClock from '../../main/Utilities/PreciseClock.ts';

describe('PreciseClock', () => {
  let callback: ReturnType<typeof vi.fn>;
  let clock: PreciseClock;

  beforeEach(() => {
    vi.useFakeTimers();
    callback = vi.fn();
    clock = new PreciseClock(callback, 1000);
  });

  afterEach(() => {
    clock.stop();
    vi.useRealTimers();
  });

  it('is not running initially', () => {
    expect(clock.isRunning()).toBe(false);
    expect(clock.ticks()).toBe(0);
  });

  it('ticks exactly on the interval boundary', () => {
    clock.start();
    vi.advanceTimersByTime(999);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenLastCalledWith(1);
  });

  it('does not accumulate error over many ticks', () => {
    clock.start();
    vi.advanceTimersByTime(3600 * 1000 - 1);
    expect(clock.ticks()).toBe(3599);
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(3600);
    expect(callback).toHaveBeenLastCalledWith(3600);
  });

  it('keeps the partial tick across stop and start', () => {
    clock.start();
    vi.advanceTimersByTime(1400);
    clock.stop();
    vi.advanceTimersByTime(5000);
    expect(clock.ticks()).toBe(1);
    clock.start();
    vi.advanceTimersByTime(599);
    expect(clock.ticks()).toBe(1);
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenLastCalledWith(2);
  });

  it('applies an interval change only from the moment it happens', () => {
    clock.start();
    vi.advanceTimersByTime(500); // half a tick at 1000ms
    clock.setInterval(500);
    vi.advanceTimersByTime(249);
    expect(clock.ticks()).toBe(0);
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenLastCalledWith(1);
  });

  it('jumps to the correct value when the event loop was blocked', () => {
    let now = 0;
    clock = new PreciseClock(callback, 1000, () => now);
    clock.start();
    now = 3500;
    vi.advanceTimersByTime(3500);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenLastCalledWith(3);
  });

  it('advance adds unseen time while running', () => {
    clock.start();
    clock.advance(2500);
    expect(callback).toHaveBeenLastCalledWith(2);
    vi.advanceTimersByTime(500);
    expect(callback).toHaveBeenLastCalledWith(3);
  });

  it('advance is ignored while stopped', () => {
    clock.advance(2500);
    expect(clock.ticks()).toBe(0);
  });

  it('reset clears elapsed time', () => {
    clock.start();
    vi.advanceTimersByTime(2300);
    clock.reset();
    expect(clock.ticks()).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenLastCalledWith(1);
  });

  it('stops scheduling when stopped from the callback', () => {
    clock = new PreciseClock(() => { callback(); clock.stop(); }, 1000);
    clock.start();
    vi.advanceTimersByTime(5000);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
