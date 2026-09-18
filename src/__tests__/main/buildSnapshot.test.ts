import {describe, expect, it, vi} from 'vitest';

// TimersOrchestrator reaches for electron and the native NDI/OMT addons at import time, so they
// are stubbed before the import. buildSnapshot only reads this.timers/playingSounds/app, so the
// method is invoked against a plain stub rather than a constructed orchestrator
vi.mock('electron', () => ({
  BrowserWindow: class {},
  powerMonitor: {on: vi.fn()},
  screen: {getAllDisplays: vi.fn(() => []), on: vi.fn()},
  app: {isPackaged: false, getPath: vi.fn(() => '/tmp')},
  ipcMain: {handle: vi.fn(), on: vi.fn()},
}));
vi.mock('../../main/Remotes/NDI.ts', () => ({default: class {}}));
vi.mock('../../main/Remotes/OMT.ts', () => ({default: class {}}));

import {TimersOrchestrator} from '../../main/Utilities/TimersOrchestrator.ts';

const buildSnapshot = TimersOrchestrator.prototype.buildSnapshot;

function makeEngine(state: string, message: string | null) {
  return {
    webSocketState: vi.fn(() => ({state, setTime: 60, setTimeHms: '00:01:00'})),
    message,
  };
}

function makeStub(timers: Record<string, unknown>, playing: string[] = []) {
  const settingsTimers = Object.fromEntries(
    Object.keys(timers).map(id => [id, {name: `Timer ${id}`}])
  );
  return {
    timers,
    playingSounds: new Set(playing),
    app: {config: {settings: {timers: settingsTimers}}},
  };
}

describe('TimersOrchestrator.buildSnapshot', () => {
  it('includes a state entry per timer, tagged with its id', () => {
    const stub = makeStub({
      timer1: {engine: makeEngine('Running', null)},
      timer2: {engine: makeEngine('Paused', null)},
    });

    const snapshot = buildSnapshot.call(stub);

    expect(Object.keys(snapshot.timerEngine)).toEqual(['timer1', 'timer2']);
    expect(snapshot.timerEngine.timer1.state).toBe('Running');
    expect(snapshot.timerEngine.timer1.timerId).toBe('timer1');
    expect(snapshot.timerEngine.timer2.state).toBe('Paused');
  });

  it('carries the current message per timer', () => {
    const stub = makeStub({
      timer1: {engine: makeEngine('Running', 'stand by')},
      timer2: {engine: makeEngine('Running', null)},
    });

    const snapshot = buildSnapshot.call(stub);

    expect(snapshot.messages).toEqual({timer1: 'stand by', timer2: null});
  });

  it('normalises an absent message to null', () => {
    const stub = makeStub({timer1: {engine: makeEngine('Running', undefined as never)}});
    expect(buildSnapshot.call(stub).messages.timer1).toBeNull();
  });

  it('reports which timers have a sound playing', () => {
    const stub = makeStub(
      {timer1: {engine: makeEngine('Expired', null)}},
      ['timer1']
    );
    expect(buildSnapshot.call(stub).playingTimerIds).toEqual(['timer1']);
  });

  it('includes the timer config', () => {
    const stub = makeStub({timer1: {engine: makeEngine('Running', null)}});
    expect(buildSnapshot.call(stub).timers).toEqual({timer1: {name: 'Timer timer1'}});
  });

  it('is empty but well formed with no timers', () => {
    const snapshot = buildSnapshot.call(makeStub({}));

    expect(snapshot.timerEngine).toEqual({});
    expect(snapshot.messages).toEqual({});
    expect(snapshot.playingTimerIds).toEqual([]);
  });
});
