import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlaybackManager } from '../../main/Playback/PlaybackManager.ts';
import type { PlaybackProvider, PlaybackProviderContext } from '../../main/Playback/PlaybackProvider.ts';
import { PlaybackProviderConfig, PlaybackProviderStatus, PlaybackState, VMIX_PROVIDER_ID } from '../../common/playback.ts';

/**
 * Deliberately not the vMix provider: the manager is the reusable half of the feature, so it is
 * tested against a provider that speaks no protocol at all.
 */
class FakeProvider implements PlaybackProvider {
  readonly id = VMIX_PROVIDER_ID;
  context: PlaybackProviderContext;
  enabled = false;
  stopped = 0;

  constructor(context: PlaybackProviderContext) {
    this.context = context;
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

    manager.applyState({[VMIX_PROVIDER_ID]: {enabled: true}});
    onState.mockClear();
  });

  afterEach(() => {
    manager.stop();
    vi.useRealTimers();
  });

  it('passes a new state through to the timers', () => {
    provider.publish(state());

    expect(onState).toHaveBeenCalledWith(VMIX_PROVIDER_ID, expect.objectContaining({remainingSeconds: 30}));
    expect(manager.stateFor(VMIX_PROVIDER_ID)?.remainingSeconds).toBe(30);
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

    expect(manager.stateFor(VMIX_PROVIDER_ID)).not.toBeNull();
    expect(onState).not.toHaveBeenCalledWith(VMIX_PROVIDER_ID, null);
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
    expect(onState).toHaveBeenCalledWith(VMIX_PROVIDER_ID, null);
    expect(manager.stateFor(VMIX_PROVIDER_ID)).toBeNull();
  });

  it('releases the timers when a provider reports nothing playing', () => {
    provider.publish(state());
    onState.mockClear();

    provider.publish(null);

    expect(onState).toHaveBeenCalledWith(VMIX_PROVIDER_ID, null);
  });

  it('does not re-emit null when there was no state to begin with', () => {
    provider.publish(null);
    expect(onState).not.toHaveBeenCalled();
  });

  it('releases the timers on stop', () => {
    provider.publish(state());
    onState.mockClear();

    manager.stop();

    expect(onState).toHaveBeenCalledWith(VMIX_PROVIDER_ID, null);
    expect(provider.stopped).toBe(1);
  });

  it('hands the provider its config on every save', () => {
    manager.applyState({[VMIX_PROVIDER_ID]: {enabled: false}});
    expect(provider.enabled).toBe(false);
  });

  it('fills in defaults for a provider missing from the stored config', () => {
    manager.applyState({});
    expect(provider.enabled).toBe(false);
  });

  it('pushes status only when it actually changes', () => {
    onStatus.mockClear();
    manager.applyState({[VMIX_PROVIDER_ID]: {enabled: true}});
    manager.applyState({[VMIX_PROVIDER_ID]: {enabled: true}});
    expect(onStatus).not.toHaveBeenCalled();

    manager.applyState({[VMIX_PROVIDER_ID]: {enabled: false}});
    expect(onStatus).toHaveBeenCalledTimes(1);
  });
});
