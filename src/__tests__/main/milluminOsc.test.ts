import { describe, it, expect } from 'vitest';
import { flattenOscBundle, MilluminTracker, parseMilluminAddress } from '../../main/Playback/providers/millumin/milluminOsc.ts';

const OPTIONS = {layer: '', playingTimeoutMs: 2000};

function tracker() {
  const t = new MilluminTracker();
  return {
    t,
    started: (layer: string, name: string, duration: number, now = 1000) =>
      t.handleMessage(`/millumin/layer:${layer}/mediaStarted`, [0, name, duration], now),
    time: (layer: string, elapsed: number, duration: number, now = 1000) =>
      t.handleMessage(`/millumin/layer:${layer}/media/time`, [elapsed, duration], now),
    paused: (layer: string, now = 1000) =>
      t.handleMessage(`/millumin/layer:${layer}/mediaPaused`, [0, 'x'], now),
    stopped: (layer: string, now = 1000) =>
      t.handleMessage(`/millumin/layer:${layer}/mediaStopped`, [0, 'x'], now),
  };
}

describe('flattenOscBundle', () => {
  it('pulls the messages out of a bundle', () => {
    expect(flattenOscBundle({timetag: [0, 0], elements: [['/a', 1], ['/b', 2]]}))
      .toEqual([['/a', 1], ['/b', 2]]);
  });

  it('walks nested bundles', () => {
    const nested = {timetag: [0, 0], elements: [['/a', 1], {timetag: [0, 0], elements: [['/b', 2]]}]};
    expect(flattenOscBundle(nested)).toEqual([['/a', 1], ['/b', 2]]);
  });

  it('returns nothing for a plain message or junk', () => {
    expect(flattenOscBundle(['/a', 1])).toEqual([]);
    expect(flattenOscBundle(null)).toEqual([]);
    expect(flattenOscBundle({})).toEqual([]);
  });
});

describe('parseMilluminAddress', () => {
  it('splits a layer address', () => {
    expect(parseMilluminAddress('/millumin/layer:Main/mediaStarted')).toEqual({layer: 'Main', path: 'mediaStarted'});
  });

  it('keeps the whole media/time path', () => {
    expect(parseMilluminAddress('/millumin/layer:Main/media/time')).toEqual({layer: 'Main', path: 'media/time'});
  });

  it('handles a layer name with spaces', () => {
    expect(parseMilluminAddress('/millumin/layer:Video Layer 2/media/time')?.layer).toBe('Video Layer 2');
  });

  it('accepts the index and selectedLayer forms', () => {
    expect(parseMilluminAddress('/millumin/index:3/mediaStarted')?.layer).toBe('index:3');
    expect(parseMilluminAddress('/millumin/selectedLayer/media/time')?.layer).toBe('selectedLayer');
  });

  it('ignores addresses that carry no media time', () => {
    expect(parseMilluminAddress('/millumin/board/launchedColumn')).toBeNull();
    expect(parseMilluminAddress('/millumin/light:Key/intensity')).toBeNull();
    expect(parseMilluminAddress('/something/else')).toBeNull();
  });
});

describe('MilluminTracker', () => {
  it('reports nothing before any message arrives', () => {
    expect(new MilluminTracker().state(1000, OPTIONS)).toBeNull();
  });

  it('mirrors a started layer once its time arrives', () => {
    const {t, started, time} = tracker();
    started('Main', 'Package.mov', 60);
    time('Main', 12.5, 60);

    expect(t.state(1000, OPTIONS)).toEqual({
      clipId: 'Main:Package.mov:1',
      title: 'Package.mov',
      remainingSeconds: 48,
      totalSeconds: 60,
      isRunning: true,
      isLooping: false,
    });
  });

  it('tracks a layer known only from media/time, as selectedLayer sends', () => {
    const {t} = tracker();
    t.handleMessage('/millumin/selectedLayer/media/time', [10, 30], 1000);

    expect(t.state(1000, OPTIONS)).toMatchObject({remainingSeconds: 20, totalSeconds: 30, isRunning: true});
  });

  it('holds the time and reports not running when paused', () => {
    const {t, started, time, paused} = tracker();
    started('Main', 'Package.mov', 60);
    time('Main', 12, 60);
    paused('Main');

    expect(t.state(1000, OPTIONS)).toMatchObject({remainingSeconds: 48, isRunning: false});
  });

  it('releases the timers when the media stops', () => {
    const {t, started, time, stopped} = tracker();
    started('Main', 'Package.mov', 60);
    time('Main', 12, 60);
    stopped('Main');

    expect(t.state(1000, OPTIONS)).toBeNull();
  });

  it('releases the timers once the clip has played out', () => {
    const {t, started, time} = tracker();
    started('Main', 'Package.mov', 60);
    time('Main', 60, 60);

    expect(t.state(1000, OPTIONS)).toBeNull();
  });

  it('ignores a layer with no duration, as a still image has', () => {
    const {t, started} = tracker();
    started('Main', 'Logo.png', 0);

    expect(t.state(1000, OPTIONS)).toBeNull();
  });

  it('drops a playing layer that went silent, which means Millumin went away', () => {
    const {t, started, time} = tracker();
    started('Main', 'Package.mov', 60, 1000);
    time('Main', 12, 60, 1000);

    expect(t.state(2500, OPTIONS)).not.toBeNull();
    expect(t.state(3500, OPTIONS)).toBeNull();
  });

  it('holds a paused layer indefinitely, because a paused clip sends nothing', () => {
    const {t, started, time, paused} = tracker();
    started('Main', 'Package.mov', 60, 1000);
    time('Main', 12, 60, 1000);
    paused('Main', 1000);

    expect(t.state(60_000, OPTIONS)).toMatchObject({remainingSeconds: 48, isRunning: false});
  });

  it('prefers a running layer over a paused one', () => {
    const {t, started, time, paused} = tracker();
    started('Bed', 'Loop.mov', 120, 1000);
    time('Bed', 10, 120, 1000);
    paused('Bed', 1000);

    started('Main', 'Package.mov', 60, 1000);
    time('Main', 10, 60, 1000);

    expect(t.state(1000, OPTIONS)?.title).toBe('Package.mov');
  });

  it('prefers the most recently started layer when several are running', () => {
    const {t, started, time} = tracker();
    started('A', 'First.mov', 60, 1000);
    time('A', 1, 60, 1000);
    started('B', 'Second.mov', 60, 1000);
    time('B', 1, 60, 1000);

    expect(t.state(1000, OPTIONS)?.title).toBe('Second.mov');
  });

  it('follows only the configured layer when one is set', () => {
    const {t, started, time} = tracker();
    started('Bed', 'Loop.mov', 120, 1000);
    time('Bed', 10, 120, 1000);
    started('Main', 'Package.mov', 60, 1000);
    time('Main', 10, 60, 1000);

    expect(t.state(1000, {layer: 'Bed', playingTimeoutMs: 2000})?.title).toBe('Loop.mov');
    expect(t.state(1000, {layer: 'Missing', playingTimeoutMs: 2000})).toBeNull();
  });

  it('gives a restarted clip a new id so the timers see a new item', () => {
    const {t, started, time} = tracker();
    started('Main', 'Package.mov', 60, 1000);
    time('Main', 30, 60, 1000);
    const first = t.state(1000, OPTIONS)?.clipId;

    started('Main', 'Package.mov', 60, 1000);
    time('Main', 30, 60, 1000);

    expect(t.state(1000, OPTIONS)?.clipId).not.toBe(first);
  });

  it('ignores messages that are not Millumin feedback', () => {
    const {t} = tracker();
    t.handleMessage('/millumin/board/launchedColumn', [1, 'Column'], 1000);
    t.handleMessage('/other/thing', [1], 1000);

    expect(t.state(1000, OPTIONS)).toBeNull();
  });

  it('survives a media/time with junk arguments', () => {
    const {t} = tracker();
    t.handleMessage('/millumin/layer:Main/media/time', ['nope', undefined], 1000);

    expect(t.state(1000, OPTIONS)).toBeNull();
  });
});
