import {describe, expect, it} from 'vitest';
import {fileBaseName, sanitizeTimersForWire} from '../../common/protocol.ts';
import type {Timers} from '../../common/config.ts';

function timers(overrides: Record<string, unknown> = {}): Timers {
  return {
    timer1: {
      name: 'Stage',
      timerDuration: 1000,
      setTimeLive: false,
      stopTimerAtZero: false,
      followTimer: '',
      audioFile: '/Users/someone/Music/airhorn.mp3',
      audioOutputDeviceId: 'device-abc-123',
      windows: {
        win1: {
          bounds: {x: 100, y: 200, width: 800, height: 600, alwaysOnTop: true, hidden: false},
          show: {timer: true},
          messageBoxFixedHeight: false,
          contentAtReset: 'FULL',
          colors: {background: '#000000', thresholds: []},
          pulseAtZero: false,
          use12HourClock: false,
        },
      },
      ...overrides,
    },
  } as unknown as Timers;
}

describe('fileBaseName', () => {
  it('strips a posix path', () => {
    expect(fileBaseName('/Users/someone/Music/airhorn.mp3')).toBe('airhorn.mp3');
  });

  it('strips a windows path', () => {
    expect(fileBaseName('C:\\Users\\someone\\Music\\airhorn.mp3')).toBe('airhorn.mp3');
  });

  it('leaves a bare name alone', () => {
    expect(fileBaseName('airhorn.mp3')).toBe('airhorn.mp3');
  });

  it('copes with an empty string', () => {
    expect(fileBaseName('')).toBe('');
  });
});

describe('sanitizeTimersForWire', () => {
  describe('what it removes', () => {
    it('never sends the audio file path', () => {
      const wire = sanitizeTimersForWire(timers());
      expect(JSON.stringify(wire)).not.toContain('/Users/someone');
      expect(JSON.stringify(wire)).not.toContain('Music');
    });

    it('never sends the audio output device id', () => {
      const wire = sanitizeTimersForWire(timers());
      expect(JSON.stringify(wire)).not.toContain('device-abc-123');
      expect(wire.timer1).not.toHaveProperty('audioOutputDeviceId');
    });

    it('never sends window geometry', () => {
      const wire = sanitizeTimersForWire(timers());
      expect(wire.timer1.windows.win1).not.toHaveProperty('bounds');
    });
  });

  describe('what it keeps', () => {
    // Consumers only test audioFile for truthiness, so the name is enough and stays useful
    it('keeps the audio file name so clients can still tell audio is set', () => {
      const wire = sanitizeTimersForWire(timers());
      expect(wire.timer1.audioFile).toBe('airhorn.mp3');
      expect(!!wire.timer1.audioFile).toBe(true);
    });

    it('keeps audioFile null when there is none', () => {
      const wire = sanitizeTimersForWire(timers({audioFile: null}));
      expect(wire.timer1.audioFile).toBeNull();
    });

    it('keeps the fields the control panel reads', () => {
      const wire = sanitizeTimersForWire(timers({followTimer: 'timer2'}));
      expect(wire.timer1.name).toBe('Stage');
      expect(wire.timer1.followTimer).toBe('timer2');
      expect(wire.timer1.timerDuration).toBe(1000);
    });

    // The display renders from every window field except bounds
    it('keeps the fields the countdown display reads', () => {
      const window = sanitizeTimersForWire(timers()).timer1.windows.win1;
      expect(window.contentAtReset).toBe('FULL');
      expect(window.colors).toBeDefined();
      expect(window.show).toBeDefined();
      expect(window.pulseAtZero).toBe(false);
      expect(window.use12HourClock).toBe(false);
      expect(window.messageBoxFixedHeight).toBe(false);
    });

    it('keeps the window ids', () => {
      expect(Object.keys(sanitizeTimersForWire(timers()).timer1.windows)).toEqual(['win1']);
    });
  });

  describe('robustness', () => {
    it('does not mutate the config it was given', () => {
      const original = timers();
      sanitizeTimersForWire(original);
      expect(original.timer1.audioFile).toBe('/Users/someone/Music/airhorn.mp3');
      expect(original.timer1.windows.win1.bounds).toBeDefined();
    });

    it('handles a timer with no windows', () => {
      const wire = sanitizeTimersForWire(timers({windows: {}}));
      expect(wire.timer1.windows).toEqual({});
    });

    it('handles an empty timer map', () => {
      expect(sanitizeTimersForWire({} as Timers)).toEqual({});
    });

    it('handles a missing timer map', () => {
      expect(sanitizeTimersForWire(undefined as never)).toEqual({});
    });
  });
});
