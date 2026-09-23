import { describe, it, expect } from 'vitest';
import {
  DEFAULT_MILLUMIN_CONFIG,
  DEFAULT_PLAYBACK_SETTINGS,
  DEFAULT_VMIX_CONFIG,
  MILLUMIN_PROVIDER_ID,
  PLAYBACK_PROVIDERS,
  playbackProviderMeta,
  playbackStateEquals,
  resolveSourceConfig,
  playbackSourceLabel,
  defaultSourceName,
  VMIX_PROVIDER_ID,
} from '../../common/playback.ts';

describe('provider registry', () => {
  it('has a unique id per provider', () => {
    const ids = PLAYBACK_PROVIDERS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('starts with no sources, because they are added by hand', () => {
    expect(DEFAULT_PLAYBACK_SETTINGS).toEqual({});
  });

  it('looks a provider up by id', () => {
    expect(playbackProviderMeta(MILLUMIN_PROVIDER_ID)?.displayName).toBe('Millumin');
    expect(playbackProviderMeta('nope')).toBeNull();
  });
});

describe('resolveSourceConfig', () => {
  it('fills in the defaults for keys a stored source predates', () => {
    // The promise the architecture makes: a provider gaining a setting needs no migration
    const resolved = resolveSourceConfig({name: 'A', provider: VMIX_PROVIDER_ID, config: {enabled: true, host: '10.0.0.5'}});

    expect(resolved.enabled).toBe(true);
    expect(resolved.host).toBe('10.0.0.5');
    expect(resolved.port).toBe(DEFAULT_VMIX_CONFIG.port);
    expect(resolved.input).toBe('');
  });

  it('falls back to the provider defaults for a source with no config', () => {
    expect(resolveSourceConfig({name: 'A', provider: MILLUMIN_PROVIDER_ID, config: undefined as never}))
      .toEqual(DEFAULT_MILLUMIN_CONFIG);
  });

  it('reports an unknown provider as disabled rather than throwing', () => {
    expect(resolveSourceConfig({name: 'A', provider: 'not-a-provider', config: {enabled: true}}))
      .toEqual({enabled: false});
    expect(resolveSourceConfig(undefined)).toEqual({enabled: false});
  });
});

describe('source naming', () => {
  it('names the first source of a kind after the provider', () => {
    expect(defaultSourceName(MILLUMIN_PROVIDER_ID, {})).toBe('Millumin');
  });

  it('numbers further sources of the same kind', () => {
    const settings = {a: {name: 'Millumin', provider: MILLUMIN_PROVIDER_ID, config: {enabled: true}}};
    expect(defaultSourceName(MILLUMIN_PROVIDER_ID, settings)).toBe('Millumin 2');
    expect(defaultSourceName(VMIX_PROVIDER_ID, settings)).toBe('vMix');
  });

  it('labels a source by its name, falling back to the provider', () => {
    const settings = {
      a: {name: 'Stage left', provider: MILLUMIN_PROVIDER_ID, config: {enabled: true}},
      b: {name: '', provider: VMIX_PROVIDER_ID, config: {enabled: true}},
    };

    expect(playbackSourceLabel('a', settings)).toBe('Stage left');
    expect(playbackSourceLabel('b', settings)).toBe('vMix');
    expect(playbackSourceLabel('gone', settings)).toBe('gone');
  });
});

describe('playbackStateEquals', () => {
  const state = {
    clipId: 'clip-1',
    title: 'Package.mov',
    remainingSeconds: 30,
    totalSeconds: 60,
    isRunning: true,
    isLooping: false,
  };

  it('treats two nulls as equal', () => {
    expect(playbackStateEquals(null, null)).toBe(true);
  });

  it('treats a null against a state as different', () => {
    expect(playbackStateEquals(null, state)).toBe(false);
    expect(playbackStateEquals(state, null)).toBe(false);
  });

  it('spots a renamed item, which the timers show and template messages use', () => {
    expect(playbackStateEquals(state, {...state, title: 'Other.mov'})).toBe(false);
  });

  it('compares media field by field', () => {
    const withMedia = {...state, media: {cue_number: '1', cue_name: 'Intro'}};
    expect(playbackStateEquals(withMedia, {...withMedia, media: {cue_number: '1', cue_name: 'Intro'}})).toBe(true);
    expect(playbackStateEquals(withMedia, {...withMedia, media: {cue_number: '2', cue_name: 'Intro'}})).toBe(false);
    expect(playbackStateEquals(withMedia, state)).toBe(false);
  });

  it('spots a different clip at the same time', () => {
    expect(playbackStateEquals(state, {...state, clipId: 'clip-2'})).toBe(false);
  });

  it('spots the time moving on and the run state changing', () => {
    expect(playbackStateEquals(state, {...state, remainingSeconds: 29})).toBe(false);
    expect(playbackStateEquals(state, {...state, isRunning: false})).toBe(false);
  });
});
