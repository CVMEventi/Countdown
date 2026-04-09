import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OSC } from '../../main/Remotes/OSC.ts';

function makeOrchestrator(timerIds: string[] = ['timer1']) {
  const engine = {
    set: vi.fn(),
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    reset: vi.fn(),
    toggleTimer: vi.fn(),
    jogSet: vi.fn(),
    jogCurrent: vi.fn(),
  };
  const timers: Record<string, { engine: typeof engine }> = {};
  timerIds.forEach(id => { timers[id] = { engine }; });
  return { orchestrator: { timers } as any, engine };
}

describe('OSC._messageReceived', () => {
  let osc: OSC;
  let engine: ReturnType<typeof makeOrchestrator>['engine'];

  beforeEach(() => {
    const { orchestrator, engine: e } = makeOrchestrator();
    engine = e;
    osc = new OSC(6566, orchestrator);
  });

  it('ignores messages with an unknown timerId', () => {
    osc._messageReceived(['/start', 'unknown']);
    expect(engine.start).not.toHaveBeenCalled();
  });

  it('/start without time args calls engine.start only', () => {
    osc._messageReceived(['/start', 'timer1']);
    expect(engine.start).toHaveBeenCalledOnce();
    expect(engine.set).not.toHaveBeenCalled();
  });

  it('/set calls engine.set with correct total seconds', () => {
    osc._messageReceived(['/set', 'timer1', 1, 30, 0]);
    expect(engine.set).toHaveBeenCalledWith(5400); // 1h 30m 0s
  });

  it('/set HH:MM:SS math: 1h 1m 1s = 3661s', () => {
    osc._messageReceived(['/set', 'timer1', 1, 1, 1]);
    expect(engine.set).toHaveBeenCalledWith(3661);
  });

  it('/toggle-pause calls engine.toggleTimer', () => {
    osc._messageReceived(['/toggle-pause', 'timer1']);
    expect(engine.toggleTimer).toHaveBeenCalledOnce();
  });

  it('/pause calls engine.pause', () => {
    osc._messageReceived(['/pause', 'timer1']);
    expect(engine.pause).toHaveBeenCalledOnce();
  });

  it('/resume calls engine.resume', () => {
    osc._messageReceived(['/resume', 'timer1']);
    expect(engine.resume).toHaveBeenCalledOnce();
  });

  it('/reset calls engine.reset', () => {
    osc._messageReceived(['/reset', 'timer1']);
    expect(engine.reset).toHaveBeenCalledOnce();
  });

  it('/jog-set calls engine.jogSet with correct seconds', () => {
    osc._messageReceived(['/jog-set', 'timer1', 0, 5, 30]);
    expect(engine.jogSet).toHaveBeenCalledWith(330); // 5m 30s
  });

  it('/jog-current calls engine.jogCurrent with correct seconds', () => {
    osc._messageReceived(['/jog-current', 'timer1', 0, 0, 45]);
    expect(engine.jogCurrent).toHaveBeenCalledWith(45);
  });

  it('unknown message type is silently ignored', () => {
    osc._messageReceived(['/unknown', 'timer1']);
    expect(engine.set).not.toHaveBeenCalled();
    expect(engine.start).not.toHaveBeenCalled();
  });
});
