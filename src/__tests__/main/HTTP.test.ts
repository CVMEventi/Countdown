import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Stub webpack-injected globals before HTTP module is loaded
vi.stubGlobal('REMOTE_VITE_DEV_SERVER_URL', 'http://localhost:5173');
vi.stubGlobal('REMOTE_VITE_NAME', 'remote_window');

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  app: { isPackaged: false },
  BrowserWindow: class {},
}));

import HTTP from '../../main/Remotes/HTTP.ts';

function makeEngine() {
  return {
    set: vi.fn(),
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    reset: vi.fn(),
    toggleTimer: vi.fn(),
    jogSet: vi.fn(),
    jogCurrent: vi.fn(),
    setMessage: vi.fn(),
  };
}

function makeOrchestrator(timerIds: string[] = ['timer1']) {
  const engine = makeEngine();
  const timers: Record<string, { engine: ReturnType<typeof makeEngine> }> = {};
  timerIds.forEach(id => { timers[id] = { engine }; });
  return {
    orchestrator: {
      timers,
      app: { config: { settings: { timers: {} } } },
    } as any,
    engine,
  };
}

describe('HTTP routes', () => {
  let http: HTTP;
  let engine: ReturnType<typeof makeEngine>;

  beforeEach(() => {
    const { orchestrator, engine: e } = makeOrchestrator();
    engine = e;
    http = new HTTP(orchestrator, null as any);
  });

  afterEach(async () => {
    await http.fastifyServer.close();
  });

  describe('timer-scoped routes (/timer/:timerId/...)', () => {
    it('returns 404 for unknown timerId', async () => {
      const res = await http.fastifyServer.inject({ method: 'GET', url: '/timer/unknown/start' });
      expect(res.statusCode).toBe(404);
    });

    it('/start calls engine.start', async () => {
      const res = await http.fastifyServer.inject({ method: 'GET', url: '/timer/timer1/start' });
      expect(res.statusCode).toBe(200);
      expect(engine.start).toHaveBeenCalledOnce();
    });

    it('/start/:h/:m/:s calls engine.set then engine.start', async () => {
      const res = await http.fastifyServer.inject({ method: 'GET', url: '/timer/timer1/start/1/30/0' });
      expect(res.statusCode).toBe(200);
      expect(engine.set).toHaveBeenCalledWith(5400); // 1h 30m = 5400s
      expect(engine.start).toHaveBeenCalledOnce();
    });

    it('/set/:h/:m/:s calls engine.set with correct seconds', async () => {
      const res = await http.fastifyServer.inject({ method: 'GET', url: '/timer/timer1/set/0/5/30' });
      expect(res.statusCode).toBe(200);
      expect(engine.set).toHaveBeenCalledWith(330); // 5m 30s
    });

    it('/set parseHms: 1h 1m 1s = 3661s', async () => {
      await http.fastifyServer.inject({ method: 'GET', url: '/timer/timer1/set/1/1/1' });
      expect(engine.set).toHaveBeenCalledWith(3661);
    });

    it('/pause calls engine.pause', async () => {
      const res = await http.fastifyServer.inject({ method: 'GET', url: '/timer/timer1/pause' });
      expect(res.statusCode).toBe(200);
      expect(engine.pause).toHaveBeenCalledOnce();
    });

    it('/resume calls engine.resume', async () => {
      const res = await http.fastifyServer.inject({ method: 'GET', url: '/timer/timer1/resume' });
      expect(res.statusCode).toBe(200);
      expect(engine.resume).toHaveBeenCalledOnce();
    });

    it('/reset calls engine.reset', async () => {
      const res = await http.fastifyServer.inject({ method: 'GET', url: '/timer/timer1/reset' });
      expect(res.statusCode).toBe(200);
      expect(engine.reset).toHaveBeenCalledOnce();
    });

    it('/toggle-pause calls engine.toggleTimer', async () => {
      const res = await http.fastifyServer.inject({ method: 'GET', url: '/timer/timer1/toggle-pause' });
      expect(res.statusCode).toBe(200);
      expect(engine.toggleTimer).toHaveBeenCalledOnce();
    });

    it('/jog-set/:h/:m/:s calls engine.jogSet', async () => {
      const res = await http.fastifyServer.inject({ method: 'GET', url: '/timer/timer1/jog-set/0/1/0' });
      expect(res.statusCode).toBe(200);
      expect(engine.jogSet).toHaveBeenCalledWith(60);
    });

    it('/jog-current/:h/:m/:s calls engine.jogCurrent', async () => {
      const res = await http.fastifyServer.inject({ method: 'GET', url: '/timer/timer1/jog-current/0/0/10' });
      expect(res.statusCode).toBe(200);
      expect(engine.jogCurrent).toHaveBeenCalledWith(10);
    });

    it('/message clears the message', async () => {
      const res = await http.fastifyServer.inject({ method: 'GET', url: '/timer/timer1/message' });
      expect(res.statusCode).toBe(200);
      expect(engine.setMessage).toHaveBeenCalledWith('');
    });

    it('/message/:message sets the message', async () => {
      const res = await http.fastifyServer.inject({ method: 'GET', url: '/timer/timer1/message/hello' });
      expect(res.statusCode).toBe(200);
      expect(engine.setMessage).toHaveBeenCalledWith('hello');
    });
  });

  describe('legacy routes (first timer)', () => {
    it('/start calls engine.start on first timer', async () => {
      const res = await http.fastifyServer.inject({ method: 'GET', url: '/start' });
      expect(res.statusCode).toBe(200);
      expect(engine.start).toHaveBeenCalledOnce();
    });

    it('/start/:h/:m/:s calls engine.set then engine.start', async () => {
      const res = await http.fastifyServer.inject({ method: 'GET', url: '/start/0/10/0' });
      expect(res.statusCode).toBe(200);
      expect(engine.set).toHaveBeenCalledWith(600);
      expect(engine.start).toHaveBeenCalledOnce();
    });

    it('/pause calls engine.pause on first timer', async () => {
      const res = await http.fastifyServer.inject({ method: 'GET', url: '/pause' });
      expect(res.statusCode).toBe(200);
      expect(engine.pause).toHaveBeenCalledOnce();
    });

    it('/reset calls engine.reset on first timer', async () => {
      const res = await http.fastifyServer.inject({ method: 'GET', url: '/reset' });
      expect(res.statusCode).toBe(200);
      expect(engine.reset).toHaveBeenCalledOnce();
    });

    it('returns 404 when no timers exist', async () => {
      const { orchestrator } = makeOrchestrator([]);
      const emptyHttp = new HTTP(orchestrator, null as any);
      const res = await emptyHttp.fastifyServer.inject({ method: 'GET', url: '/start' });
      expect(res.statusCode).toBe(404);
      await emptyHttp.fastifyServer.close();
    });
  });

  describe('GET /timers', () => {
    it('returns 200 with timer config', async () => {
      const res = await http.fastifyServer.inject({ method: 'GET', url: '/timers' });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
    });
  });
});
