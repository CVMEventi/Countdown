import { describe, it, expect } from 'vitest';
import {
  formatDuration,
  playbackTemplateVars,
  renderMessageTemplate,
  templateFieldsFor,
} from '../../common/messageTemplate.ts';
import { QLAB_PROVIDER_ID, type PlaybackState } from '../../common/playback.ts';

const state: PlaybackState = {
  clipId: 'id-1',
  title: 'Package.mov',
  remainingSeconds: 48,
  totalSeconds: 3725,
  isRunning: true,
  isLooping: false,
  media: {cue_number: '12', cue_name: 'Package', cue_type: 'Video'},
};

describe('renderMessageTemplate', () => {
  it('fills in known variables', () => {
    expect(renderMessageTemplate('Video: {media_title}', {media_title: 'Intro'})).toBe('Video: Intro');
  });

  it('blanks unknown or empty variables and trims the result', () => {
    expect(renderMessageTemplate(' {missing} Cue {cue} ', {cue: null})).toBe('Cue');
  });

  it('prints numbers as they are', () => {
    expect(renderMessageTemplate('Slide {slide}', {slide: 4})).toBe('Slide 4');
  });
});

describe('formatDuration', () => {
  it('uses m:ss under an hour and h:mm:ss above', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3725)).toBe('1:02:05');
  });
});

describe('playbackTemplateVars', () => {
  it('merges the common variables with the provider media', () => {
    const vars = playbackTemplateVars(state, 'QLab main');
    expect(renderMessageTemplate('{source_name}: {cue_number} {media_title} ({duration})', vars))
      .toBe('QLab main: 12 Package.mov (1:02:05)');
  });
});

describe('templateFieldsFor', () => {
  it('lists the common fields then the provider ones', () => {
    const keys = templateFieldsFor(QLAB_PROVIDER_ID).map(field => field.key);
    expect(keys).toEqual(['media_title', 'source_name', 'duration', 'cue_number', 'cue_name', 'cue_type']);
  });

  it('lists only the common fields for an unknown provider', () => {
    expect(templateFieldsFor('nope')).toHaveLength(3);
  });
});
