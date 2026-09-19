import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlaybackManager } from '../../main/Playback/PlaybackManager.ts';
import type { PlaybackProvider, PlaybackProviderContext } from '../../main/Playback/PlaybackProvider.ts';
import { PlaybackProviderConfig, PlaybackProviderStatus, PlaybackSettings, PlaybackState, MILLUMIN_PROVIDER_ID, VMIX_PROVIDER_ID } from '../../common/playback.ts';

/**
 * Deliberately not the vMix provider: the manager is the reusable half of the feature, so it is
 * tested against a provider that speaks no protocol at all.
 */
class FakeProvider implements PlaybackProvider {
  readonly id = VMIX_PROVIDER_ID;
  static built: FakeProvider[] = [];
  context: PlaybackProviderContext;
  enabled = false;
  stopped = 0;

  constructor(context: PlaybackProviderContext) {
    this.context = context;
    FakeProvider.built.push(this);
  }

  applyConfig(config: PlaybackProviderConfig) {
    this.enabled = config.enabled;
    this.context.onStatus();
  }

  stop() {
    this.stopped += 1;
    this.enabled = false;
  }

  status(): PlaybackProviderStatus {
    return {id: this.id, enabled: this.enabled, connected: this.enabled, lastError: null, activeTitle: null};
  }

  // Test helper: what the real providers call when they learn something
  publish(state: PlaybackState | null) {
    this.context.onState(state);
  }
}

function state(overrides: Partial<PlaybackState> = {}): PlaybackState {
  return {
    clipId: 'clip-1',
    title: 'Package.mp4',
    remainingSeconds: 30,
    totalSeconds: 60,
    isRunning: true,
    isLooping: false,
    ...overrides,
  };
}

function sources(overrides: {[id: string]: Partial<PlaybackProviderConfig>} = {a: {enabled: true}}): PlaybackSettings {
  return Object.fromEntries(Object.entries(overrides).map(([id, config]) => [
    id,
    {name: id, provider: VMIX_PROVIDER_ID, config: {enabled: true, ...config} as PlaybackProviderConfig},
  ]));
}

describe('PlaybackManager', () => {
  let onState: ReturnType<typeof vi.fn>;
  let onStatus: ReturnType<typeof vi.fn>;
  let provider: FakeProvider;
  let manager: PlaybackManager;
  let now: number;

  beforeEach(() => {
    vi.useFakeTimers();
    now = 1_000;
    onState = vi.fn();
    onStatus = vi.fn();

    manager = new PlaybackManager({
      onState,
      onStatus,
      now: () => now,
      factories: {[VMIX_PROVIDER_ID]: (context) => (provider = new FakeProvider(context))},
    });

    FakeProvider.built = [];
    manager.applyState(sources());
    onState.mockClear();
  });

  afterEach(() => {
    manager.stop();
    vi.useRealTimers();
  });

  it('passes a new state through to the timers', () => {
    provider.publish(state());

    expect(onState).toHaveBeenCalledWith('a', expect.objectContaining({remainingSeconds: 30}));
    expect(manager.stateFor('a')?.remainingSeconds).toBe(30);
  });

  it('emits once when the same state is published repeatedly', () => {
    provider.publish(state());
    provider.publish(state());
    provider.publish(state());

    expect(onState).toHaveBeenCalledTimes(1);
  });

  it('emits again when the remaining time moves on', () => {
    provider.publish(state());
    provider.publish(state({remainingSeconds: 29}));

    expect(onState).toHaveBeenCalledTimes(2);
  });

  it('emits when the clip changes at the same remaining time', () => {
    provider.publish(state());
    provider.publish(state({clipId: 'clip-2'}));

    expect(onState).toHaveBeenCalledTimes(2);
  });

  it('keeps a state alive while the provider keeps refreshing it', () => {
    provider.publish(state());

    for (let i = 0; i < 10; i++) {
      now += 500;
      provider.publish(state());
      vi.advanceTimersByTime(500);
    }

    expect(manager.stateFor('a')).not.toBeNull();
    expect(onState).not.toHaveBeenCalledWith('a', null);
  });

  it('expires a state the provider stopped refreshing', () => {
    provider.publish(state());
    onState.mockClear();

    // Inside the stale window nothing happens: one lost poll must not flicker the display
    now += 800;
    vi.advanceTimersByTime(800);
    expect(onState).not.toHaveBeenCalled();

    now += 400;
    vi.advanceTimersByTime(400);
    expect(onState).toHaveBeenCalledWith('a', null);
    expect(manager.stateFor('a')).toBeNull();
  });

  it('releases the timers when a provider reports nothing playing', () => {
    provider.publish(state());
    onState.mockClear();

    provider.publish(null);

    expect(onState).toHaveBeenCalledWith('a', null);
  });

  it('does not re-emit null when there was no state to begin with', () => {
    provider.publish(null);
    expect(onState).not.toHaveBeenCalled();
  });

  it('releases the timers on stop', () => {
    provider.publish(state());
    onState.mockClear();

    manager.stop();

    expect(onState).toHaveBeenCalledWith('a', null);
    expect(provider.stopped).toBe(1);
  });

  it('hands the provider its config on every save', () => {
    manager.applyState(sources({a: {enabled: false}}));
    expect(provider.enabled).toBe(false);
  });

  it('pushes status only when it actually changes', () => {
    onStatus.mockClear();
    manager.applyState(sources({a: {enabled: true}}));
    manager.applyState(sources({a: {enabled: true}}));
    expect(onStatus).not.toHaveBeenCalled();

    manager.applyState(sources({a: {enabled: false}}));
    expect(onStatus).toHaveBeenCalledTimes(1);
  });

  describe('several sources of the same provider', () => {
    it('builds one provider per source', () => {
      FakeProvider.built = [];
      manager.applyState(sources({a: {enabled: true}, b: {enabled: true}}));

      // 'a' already existed, so only 'b' is new
      expect(FakeProvider.built).toHaveLength(1);
      expect(manager.statuses().map(s => s.id).sort()).toEqual(['a', 'b']);
    });

    it('keeps the state of each source apart', () => {
      const sourceA = provider;
      manager.applyState(sources({a: {enabled: true}, b: {enabled: true}}));
      const sourceB = FakeProvider.built[FakeProvider.built.length - 1];

      sourceA.publish(state({remainingSeconds: 30}));
      sourceB.publish(state({remainingSeconds: 5}));

      expect(manager.stateFor('a')?.remainingSeconds).toBe(30);
      expect(manager.stateFor('b')?.remainingSeconds).toBe(5);
    });

    it('stops and releases a source that was removed', () => {
      manager.applyState(sources({a: {enabled: true}, b: {enabled: true}}));
      const removed = FakeProvider.built[FakeProvider.built.length - 1];
      removed.publish(state());
      onState.mockClear();

      manager.applyState(sources({a: {enabled: true}}));

      expect(removed.stopped).toBe(1);
      expect(onState).toHaveBeenCalledWith('b', null);
      expect(manager.statuses().map(s => s.id)).toEqual(['a']);
    });

    it('rebuilds a source whose provider kind was changed', () => {
      FakeProvider.built = [];
      manager.applyState({
        a: {name: 'a', provider: MILLUMIN_PROVIDER_ID, config: {enabled: true}},
      });

      // No factory registered for millumin here, so the old vmix instance is simply torn down
      expect(manager.statuses()).toEqual([]);
    });
  });
});
