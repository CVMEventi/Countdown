import { describe, it, expect } from 'vitest';
import { getActiveThreshold, ColorThreshold } from '../../common/config.ts';

const makeThreshold = (overrides: Partial<ColorThreshold> = {}): ColorThreshold => ({
  id: 'test',
  type: 'minutes',
  value: 2,
  background: '#000000',
  text: '#ffffff',
  ...overrides,
});

describe('getActiveThreshold', () => {
  it('returns null when thresholds array is empty', () => {
    expect(getActiveThreshold([], 120, 600)).toBeNull();
  });

  describe('minutes type', () => {
    it('returns null when currentSeconds/60 > threshold value', () => {
      const t = makeThreshold({ type: 'minutes', value: 2 });
      // 5 minutes remaining → does not match 2-minute threshold
      expect(getActiveThreshold([t], 300, 600)).toBeNull();
    });

    it('returns threshold when currentSeconds/60 <= value', () => {
      const t = makeThreshold({ type: 'minutes', value: 2 });
      // exactly 2 minutes
      expect(getActiveThreshold([t], 120, 600)).toBe(t);
    });

    it('returns threshold when currentSeconds/60 < value', () => {
      const t = makeThreshold({ type: 'minutes', value: 2 });
      // 1 minute remaining
      expect(getActiveThreshold([t], 60, 600)).toBe(t);
    });

    it('matches at exactly zero seconds', () => {
      const t = makeThreshold({ type: 'minutes', value: 2 });
      expect(getActiveThreshold([t], 0, 600)).toBe(t);
    });
  });

  describe('percent type', () => {
    it('returns null when setSeconds is 0', () => {
      const t = makeThreshold({ type: 'percent', value: 50 });
      expect(getActiveThreshold([t], 0, 0)).toBeNull();
    });

    it('returns null when percentage remaining > threshold value', () => {
      const t = makeThreshold({ type: 'percent', value: 50 });
      // 400 of 600 = 66.7% remaining → above 50%
      expect(getActiveThreshold([t], 400, 600)).toBeNull();
    });

    it('returns threshold when percentage remaining <= value', () => {
      const t = makeThreshold({ type: 'percent', value: 50 });
      // 300 of 600 = 50% remaining
      expect(getActiveThreshold([t], 300, 600)).toBe(t);
    });

    it('returns threshold when percentage is below value', () => {
      const t = makeThreshold({ type: 'percent', value: 50 });
      // 100 of 600 = 16.7% remaining
      expect(getActiveThreshold([t], 100, 600)).toBe(t);
    });
  });

  describe('multiple thresholds — most restrictive wins', () => {
    it('picks the threshold with the smallest equivalent seconds', () => {
      const t5 = makeThreshold({ id: 't5', type: 'minutes', value: 5 });
      const t2 = makeThreshold({ id: 't2', type: 'minutes', value: 2 });
      // 1 minute remaining — both match, t2 is more restrictive
      expect(getActiveThreshold([t5, t2], 60, 600)).toBe(t2);
    });

    it('returns the only matching threshold when others do not match', () => {
      const t5 = makeThreshold({ id: 't5', type: 'minutes', value: 5 });
      const t2 = makeThreshold({ id: 't2', type: 'minutes', value: 2 });
      // 4 minutes remaining — only t5 matches
      expect(getActiveThreshold([t5, t2], 240, 600)).toBe(t5);
    });

    it('compares mixed types correctly', () => {
      const tMin = makeThreshold({ id: 'min', type: 'minutes', value: 3 }); // 3 min = 180s
      const tPct = makeThreshold({ id: 'pct', type: 'percent', value: 20 }); // 20% of 600 = 120s
      // 60 seconds remaining — both match; percent threshold is more restrictive (120s < 180s)
      expect(getActiveThreshold([tMin, tPct], 60, 600)).toBe(tPct);
    });
  });
});