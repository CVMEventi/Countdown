import { describe, it, expect } from 'vitest';
import { isOscPointAddress, OscPointTracker } from '../../main/Playback/providers/oscpoint/oscpointOsc.ts';

const OPTIONS = {playingTimeoutMs: 2000};

function tracker() {
  const t = new OscPointTracker();
  const send = (address: string, value: unknown, now = 1000, extra?: unknown) =>
    t.handleMessage(address, extra === undefined ? [value] : [value, extra], now);

  /** The stream OSCPoint sends while a slide's media plays. */
  const playing = (remaining: number, duration: number, now = 1000) => {
    send('/oscpoint/presentation/name', 'Keynote.pptx', now);
    send('/oscpoint/slideshow/state', 'running', now);
    send('/oscpoint/slideshow/currentslide', 4, now);
    send('/oscpoint/slideshow/media/state', 'playing', now);
    send('/oscpoint/slideshow/media/duration', duration, now);
    send('/oscpoint/slideshow/media/remaining', remaining, now);
  };

  return {t, send, playing};
}

describe('isOscPointAddress', () => {
  it('recognises OSCPoint addresses only', () => {
    expect(isOscPointAddress('/oscpoint/slideshow/media/state')).toBe(true);
    expect(isOscPointAddress('/millumin/layer:Main/media/time')).toBe(false);
  });
});

describe('OscPointTracker', () => {
  it('reports nothing before any message arrives', () => {
    expect(new OscPointTracker().state(1000, OPTIONS)).toBeNull();
  });

  it('counts down the media on the current slide', () => {
    const {t, playing} = tracker();
    playing(48_000, 60_000);

    expect(t.state(1000, OPTIONS)).toEqual({
      clipId: 'Keynote.pptx:4:60000',
      title: 'Keynote.pptx — slide 4',
      remainingSeconds: 48,
      totalSeconds: 60,
      isRunning: true,
      isLooping: false,
      media: {presentation: 'Keynote.pptx', slide: 4},
    });
  });

  it('prefers the trimmed duration, which is the length actually played', () => {
    const {t, playing, send} = tracker();
    playing(20_000, 60_000);
    send('/oscpoint/slideshow/media/durationtrimmed', 30_000);

    expect(t.state(1000, OPTIONS)).toMatchObject({totalSeconds: 30, remainingSeconds: 20});
  });

  it('falls back to duration minus position when remaining is absent', () => {
    const {t, send} = tracker();
    send('/oscpoint/slideshow/media/state', 'playing');
    send('/oscpoint/slideshow/media/duration', 60_000);
    send('/oscpoint/slideshow/media/position', 15_000);

    expect(t.state(1000, OPTIONS)).toMatchObject({remainingSeconds: 45, totalSeconds: 60});
  });

  it('holds the time and reports not running when paused', () => {
    const {t, playing, send} = tracker();
    playing(48_000, 60_000);
    send('/oscpoint/slideshow/media/state', 'paused');

    expect(t.state(1000, OPTIONS)).toMatchObject({remainingSeconds: 48, isRunning: false});
  });

  it('holds paused media indefinitely, because it sends nothing at all', () => {
    const {t, playing, send} = tracker();
    playing(48_000, 60_000);
    send('/oscpoint/slideshow/media/state', 'paused');

    expect(t.state(600_000, OPTIONS)).toMatchObject({remainingSeconds: 48, isRunning: false});
  });

  it('releases the timers when the media stops', () => {
    const {t, playing, send} = tracker();
    playing(48_000, 60_000);
    send('/oscpoint/slideshow/media/state', 'stopped');

    expect(t.state(1000, OPTIONS)).toBeNull();
  });

  it('releases the timers when the media is not ready', () => {
    const {t, playing, send} = tracker();
    playing(48_000, 60_000);
    send('/oscpoint/slideshow/media/state', 'notready');

    expect(t.state(1000, OPTIONS)).toBeNull();
  });

  it('releases the timers when playing media goes silent', () => {
    const {t, playing} = tracker();
    playing(48_000, 60_000, 1000);

    expect(t.state(2500, OPTIONS)).not.toBeNull();
    expect(t.state(3500, OPTIONS)).toBeNull();
  });

  it('drops the old times when the slide changes', () => {
    const {t, playing, send} = tracker();
    playing(48_000, 60_000);
    send('/oscpoint/slideshow/currentslide', 5);

    // The next slide may have no media at all; counting the old one down would be a lie
    expect(t.state(1000, OPTIONS)).toBeNull();
  });

  it('drops the media when the slideshow returns to editing', () => {
    const {t, playing, send} = tracker();
    playing(48_000, 60_000);
    send('/oscpoint/slideshow/state', 'edit');

    expect(t.state(1000, OPTIONS)).toBeNull();
  });

  it('ignores a slide with no media', () => {
    const {t, send} = tracker();
    send('/oscpoint/slideshow/state', 'running');
    send('/oscpoint/slideshow/currentslide', 2);

    expect(t.state(1000, OPTIONS)).toBeNull();
  });

  it('releases the timers once the media has played out', () => {
    const {t, playing} = tracker();
    playing(0, 60_000);

    expect(t.state(1000, OPTIONS)).toBeNull();
  });

  it('ignores media with no usable duration', () => {
    const {t, send} = tracker();
    send('/oscpoint/slideshow/media/state', 'playing');
    send('/oscpoint/slideshow/media/remaining', 5000);

    expect(t.state(1000, OPTIONS)).toBeNull();
  });

  it('reads a presentation name sent as a UTF-8 blob', () => {
    const {t, send, playing} = tracker();
    playing(48_000, 60_000);
    send('/oscpoint/presentation/name', 'Keynote', 1000, new Uint8Array(Buffer.from('Ké¥note.pptx', 'utf8')));

    expect(t.state(1000, OPTIONS)?.title).toBe('Ké¥note.pptx — slide 4');
  });

  it('ignores messages that are not OSCPoint', () => {
    const {t, send} = tracker();
    send('/millumin/layer:Main/media/time', 1);

    expect(t.state(1000, OPTIONS)).toBeNull();
  });

  it('survives junk arguments', () => {
    const {t, send} = tracker();
    send('/oscpoint/slideshow/media/state', 'playing');
    send('/oscpoint/slideshow/media/duration', 'nonsense');
    send('/oscpoint/slideshow/media/remaining', undefined);

    expect(t.state(1000, OPTIONS)).toBeNull();
  });
});
