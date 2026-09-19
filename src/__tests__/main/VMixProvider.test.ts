import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VMixProvider } from '../../main/Playback/providers/vmix/VMixProvider.ts';
import { DEFAULT_VMIX_CONFIG, PlaybackState } from '../../common/playback.ts';

const XML = `<vmix><preview>1</preview><active>2</active><inputs>
  <input key="abc" number="2" type="Video" title="Package.mp4" state="Running" position="0" duration="60000" loop="False" />
</inputs></vmix>`;

function ok(body = XML) {
  return {ok: true, status: 200, text: async () => body} as Response;
}

describe('VMixProvider', () => {
  let states: (PlaybackState | null)[];
  let fetchFn: ReturnType<typeof vi.fn>;
  let provider: VMixProvider;

  function build() {
    return new VMixProvider({
      onState: (state) => { states.push(state) },
      onStatus: () => {},
      now: () => Date.now(),
      fetchFn: fetchFn as unknown as typeof fetch,
    });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    states = [];
    fetchFn = vi.fn(async () => ok());
    provider = build();
  });

  afterEach(() => {
    provider.stop();
    vi.useRealTimers();
  });

  it('polls immediately when enabled, then on the interval', async () => {
    provider.applyConfig({...DEFAULT_VMIX_CONFIG, enabled: true, pollInterval: 250});
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(250);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('does not poll at all while disabled', async () => {
    provider.applyConfig({...DEFAULT_VMIX_CONFIG, enabled: false});
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('builds the api url from host and port', async () => {
    provider.applyConfig({...DEFAULT_VMIX_CONFIG, enabled: true, host: '10.0.0.5', port: 8088});
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchFn.mock.calls[0][0]).toBe('http://10.0.0.5:8088/api');
  });

  it('sends no auth header when no credentials are set', async () => {
    provider.applyConfig({...DEFAULT_VMIX_CONFIG, enabled: true});
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchFn.mock.calls[0][1].headers).toEqual({});
  });

  it('sends basic auth when credentials are set', async () => {
    provider.applyConfig({...DEFAULT_VMIX_CONFIG, enabled: true, username: 'user', password: 'pw'});
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchFn.mock.calls[0][1].headers).toEqual({
      Authorization: `Basic ${Buffer.from('user:pw').toString('base64')}`,
    });
  });

  it('publishes the clip on Program', async () => {
    provider.applyConfig({...DEFAULT_VMIX_CONFIG, enabled: true});
    await vi.advanceTimersByTimeAsync(0);

    expect(states[0]).toMatchObject({title: 'Package.mp4', remainingSeconds: 60, totalSeconds: 60, isRunning: true});
  });

  it('reports an auth failure without publishing a state', async () => {
    fetchFn.mockResolvedValue({ok: false, status: 401, text: async () => ''} as Response);
    provider.applyConfig({...DEFAULT_VMIX_CONFIG, enabled: true});
    await vi.advanceTimersByTimeAsync(0);

    expect(provider.status().lastError).toBe('Authentication failed');
    expect(provider.status().connected).toBe(false);
    // Deliberately no null: the manager expires the last state once it goes stale
    expect(states).toEqual([]);
  });

  it('keeps polling after a network failure', async () => {
    fetchFn.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));
    provider.applyConfig({...DEFAULT_VMIX_CONFIG, enabled: true, pollInterval: 250});
    await vi.advanceTimersByTimeAsync(0);
    expect(provider.status().lastError).toBe('connect ECONNREFUSED');

    await vi.advanceTimersByTimeAsync(250);
    expect(provider.status().connected).toBe(true);
    expect(states[states.length - 1]).toMatchObject({title: 'Package.mp4'});
  });

  it('surfaces a malformed response as an error', async () => {
    fetchFn.mockResolvedValue(ok('<html></html>'));
    provider.applyConfig({...DEFAULT_VMIX_CONFIG, enabled: true});
    await vi.advanceTimersByTimeAsync(0);

    expect(provider.status().lastError).toBe('Not a vMix API response');
  });

  it('restarts when the host changes', async () => {
    provider.applyConfig({...DEFAULT_VMIX_CONFIG, enabled: true, host: '1.1.1.1'});
    await vi.advanceTimersByTimeAsync(0);
    provider.applyConfig({...DEFAULT_VMIX_CONFIG, enabled: true, host: '2.2.2.2'});
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn.mock.calls[1][0]).toBe('http://2.2.2.2:8088/api');
  });

  it('does not restart a healthy poller on an unrelated save', async () => {
    provider.applyConfig({...DEFAULT_VMIX_CONFIG, enabled: true, pollInterval: 250});
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    provider.applyConfig({...DEFAULT_VMIX_CONFIG, enabled: true, pollInterval: 250});
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('stops polling once disabled', async () => {
    provider.applyConfig({...DEFAULT_VMIX_CONFIG, enabled: true, pollInterval: 250});
    await vi.advanceTimersByTimeAsync(0);
    provider.applyConfig({...DEFAULT_VMIX_CONFIG, enabled: false});

    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(provider.status().enabled).toBe(false);
  });
});
