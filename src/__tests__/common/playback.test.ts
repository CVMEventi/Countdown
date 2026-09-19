import { describe, it, expect } from 'vitest';
import {
  DEFAULT_MILLUMIN_CONFIG,
  DEFAULT_PLAYBACK_SETTINGS,
  DEFAULT_VMIX_CONFIG,
  MILLUMIN_PROVIDER_ID,
  PLAYBACK_PROVIDERS,
  playbackProviderMeta,
  playbackStateEquals,
  resolvePlaybackConfig,
  VMIX_PROVIDER_ID,
} from '../../common/playback.ts';

describe('provider registry', () => {
  it('has a unique id per provider', () => {
    const ids = PLAYBACK_PROVIDERS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every provider a default config that is disabled', () => {
    PLAYBACK_PROVIDERS.forEach(provider => {
      expect(provider.defaultConfig.enabled).toBe(false);
    });
  });

  it('derives the default settings from the registry', () => {
    expect(Object.keys(DEFAULT_PLAYBACK_SETTINGS).sort()).toEqual(PLAYBACK_PROVIDERS.map(p => p.id).sort());
  });

  it('hands back a copy, so one install cannot mutate the defaults of another', () => {
    expect(DEFAULT_PLAYBACK_SETTINGS[VMIX_PROVIDER_ID]).not.toBe(DEFAULT_VMIX_CONFIG);
  });

  it('looks a provider up by id', () => {
    expect(playbackProviderMeta(MILLUMIN_PROVIDER_ID)?.displayName).toBe('Millumin');
    expect(playbackProviderMeta('nope')).toBeNull();
  });
});

describe('resolvePlaybackConfig', () => {
  it('fills in the defaults for a provider the stored config has never seen', () => {
    // The promise the architecture makes: adding a provider needs no migration. A config written
    // before Millumin existed must still drive it.
    const stored = {[VMIX_PROVIDER_ID]: {enabled: true, host: '10.0.0.5'}};

    expect(resolvePlaybackConfig(stored, MILLUMIN_PROVIDER_ID)).toEqual(DEFAULT_MILLUMIN_CONFIG);
  });

  it('keeps stored values and fills only the gaps', () => {
    const resolved = resolvePlaybackConfig({[VMIX_PROVIDER_ID]: {enabled: true, host: '10.0.0.5'}}, VMIX_PROVIDER_ID);

    expect(resolved.enabled).toBe(true);
    expect(resolved.host).toBe('10.0.0.5');
    expect(resolved.port).toBe(DEFAULT_VMIX_CONFIG.port);
  });

  it('copes with playback settings that are missing entirely', () => {
    expect(resolvePlaybackConfig(undefined, VMIX_PROVIDER_ID)).toEqual(DEFAULT_VMIX_CONFIG);
  });

  it('reports an unknown provider as disabled rather than throwing', () => {
    expect(resolvePlaybackConfig({}, 'not-a-provider')).toEqual({enabled: false});
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

  it('ignores the title, which does not change what the timers show', () => {
    expect(playbackStateEquals(state, {...state, title: 'Other.mov'})).toBe(true);
  });

  it('spots a different clip at the same time', () => {
    expect(playbackStateEquals(state, {...state, clipId: 'clip-2'})).toBe(false);
  });

  it('spots the time moving on and the run state changing', () => {
    expect(playbackStateEquals(state, {...state, remainingSeconds: 29})).toBe(false);
    expect(playbackStateEquals(state, {...state, isRunning: false})).toBe(false);
  });
});
