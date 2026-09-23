import { describe, it, expect } from 'vitest';
import { PlaybackMessageTracker } from '../../main/Playback/PlaybackMessageTracker.ts';

describe('PlaybackMessageTracker', () => {
  it('does nothing while no source has a message', () => {
    const tracker = new PlaybackMessageTracker();
    expect(tracker.update(null, 'Hello')).toBeUndefined();
  });

  it('sets the message on start and restores the previous one on stop', () => {
    const tracker = new PlaybackMessageTracker();
    expect(tracker.update('Video: A', 'Hello')).toBe('Video: A');
    expect(tracker.update('Video: A', 'Video: A')).toBeUndefined();
    expect(tracker.update(null, 'Video: A')).toBe('Hello');
  });

  it('restores an empty message as null', () => {
    const tracker = new PlaybackMessageTracker();
    tracker.update('Video: A', null);
    expect(tracker.update(null, 'Video: A')).toBeNull();
  });

  it('follows a clip change and still restores the original message', () => {
    const tracker = new PlaybackMessageTracker();
    tracker.update('Video: A', 'Hello');
    expect(tracker.update('Video: B', 'Video: A')).toBe('Video: B');
    expect(tracker.update(null, 'Video: B')).toBe('Hello');
  });

  it('leaves an operator edit alone, through the end of the clip', () => {
    const tracker = new PlaybackMessageTracker();
    tracker.update('Video: A', 'Hello');
    expect(tracker.update('Video: A', 'Operator')).toBeUndefined();
    expect(tracker.update('Video: A', 'Operator')).toBeUndefined();
    expect(tracker.update(null, 'Operator')).toBeUndefined();
  });

  it('applies again on the next clip after an operator edit', () => {
    const tracker = new PlaybackMessageTracker();
    tracker.update('Video: A', 'Hello');
    tracker.update('Video: A', 'Operator');
    expect(tracker.update('Video: B', 'Operator')).toBe('Video: B');
    expect(tracker.update(null, 'Video: B')).toBe('Operator');
  });

  it('release restores the previous message', () => {
    const tracker = new PlaybackMessageTracker();
    tracker.update('Video: A', 'Hello');
    expect(tracker.release('Video: A')).toBe('Hello');
  });
});
