import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import { existsSync, writeFileSync } from 'node:fs';
import { ensureInstalledAppPath, handleStartupEvent } from '../../main/Utilities/handleStartupEvent.ts';

const { run } = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock('node:child_process', () => ({ execFile: vi.fn() }));
vi.mock('node:fs', () => ({ existsSync: vi.fn(), writeFileSync: vi.fn() }));
vi.mock('node:util', () => ({ promisify: () => run }));

beforeEach(() => {
  run.mockReset().mockResolvedValue({ stdout: '', stderr: '' });
  vi.mocked(existsSync).mockReset().mockImplementation(file => !String(file).endsWith('.shortcuts-created'));
  vi.mocked(writeFileSync).mockReset();
  vi.stubGlobal('process', {
    ...process, platform: 'win32',
    execPath: path.resolve('Countdown test', 'app-1.5.1', 'countdown.exe'),
    argv: ['countdown.exe', '--squirrel-install'],
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('Windows installer integration', () => {
  it('repairs a missing registration when an installed copy starts', async () => {
    run.mockRejectedValueOnce({ code: 1 }).mockRejectedValueOnce({ code: 1 });
    await ensureInstalledAppPath();
    expect(run.mock.calls.map(call => call[1][0])).toEqual(['query', 'query', 'add', 'add']);
  });

  it('repairs a registration pointing at an old version', async () => {
    run.mockResolvedValueOnce({ stdout: '    (Default)    REG_SZ    C:\\old\\countdown.exe\r\n' })
      .mockRejectedValueOnce({ code: 1 });
    await ensureInstalledAppPath();
    expect(run).toHaveBeenCalledTimes(4);
  });

  it('does not register again when a per-user registration is correct', async () => {
    run.mockRejectedValueOnce({ code: 1 })
      .mockResolvedValueOnce({ stdout: `    (Default)    REG_SZ    ${path.resolve('Countdown test', 'countdown.exe')}\r\n` });
    await ensureInstalledAppPath();
    expect(run.mock.calls.map(call => call[1].slice(0, 2))).toEqual([
      ['query', 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\countdown.exe'],
      ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\countdown.exe'],
    ]);
  });

  it('leaves a correct registration alone', async () => {
    run.mockResolvedValueOnce({ stdout: `    (Default)    REG_SZ    ${path.resolve('Countdown test', 'countdown.exe')}\r\n` });
    await ensureInstalledAppPath();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('does not register a portable copy', async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    await ensureInstalledAppPath();
    expect(run).not.toHaveBeenCalled();
  });

  it.each(['--squirrel-install', '--squirrel-updated'])('creates shortcuts and registers the stable launcher on %s', async command => {
    process.argv[1] = command;
    expect(await handleStartupEvent()).toBe(true);
    const root = path.resolve('Countdown test');
    const key = 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\countdown.exe';
    expect(run.mock.calls.map(call => call.slice(0, 2))).toEqual([
      [path.join(root, 'Update.exe'), ['--createShortcut', 'countdown.exe']],
      [expect.stringMatching(/reg\.exe$/), ['add', key, '/ve', '/t', 'REG_SZ', '/d', path.join(root, 'countdown.exe'), '/f']],
      [expect.stringMatching(/reg\.exe$/), ['add', key, '/v', 'Path', '/t', 'REG_SZ', '/d', root, '/f']],
    ]);
    expect(writeFileSync).toHaveBeenCalledWith(path.join(root, '.shortcuts-created'), '');
  });

  it('does not bring back deleted shortcuts on later updates', async () => {
    process.argv[1] = '--squirrel-updated';
    vi.mocked(existsSync).mockReturnValue(true);
    expect(await handleStartupEvent()).toBe(true);
    expect(run.mock.calls.some(call => call[1][0] === '--createShortcut')).toBe(false);
    expect(run.mock.calls.map(call => call[1][0])).toEqual(['add', 'add']);
  });

  it('always creates shortcuts on a fresh install', async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    await handleStartupEvent();
    expect(run.mock.calls[0][1]).toEqual(['--createShortcut', 'countdown.exe']);
  });

  it('waits for shortcut creation before reporting completion', async () => {
    let finish: (value: unknown) => void;
    run.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const operation = handleStartupEvent();
    expect(run).toHaveBeenCalledTimes(1);
    finish!({});
    expect(await operation).toBe(true);
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('removes shortcuts and App Paths on uninstall', async () => {
    process.argv[1] = '--squirrel-uninstall';
    run.mockResolvedValueOnce({}).mockResolvedValueOnce({ stdout: `    (Default)    REG_SZ    ${path.resolve('Countdown test', 'countdown.exe')}\r\n` });
    expect(await handleStartupEvent()).toBe(true);
    expect(run.mock.calls[0][1]).toEqual(['--removeShortcut', 'countdown.exe']);
    expect(run.mock.calls[2][1]).toEqual(['delete', 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\countdown.exe', '/f']);
  });

  it('falls back to per-user registration without administrator rights', async () => {
    run.mockResolvedValueOnce({}).mockRejectedValueOnce({ code: 1 });
    expect(await handleStartupEvent()).toBe(true);
    expect(run.mock.calls[2][1][1]).toBe('HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\countdown.exe');
    expect(run.mock.calls[3][1][1]).toBe('HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\countdown.exe');
  });

  it('preserves registrations owned by another installation on uninstall', async () => {
    process.argv[1] = '--squirrel-uninstall';
    run.mockResolvedValue({ stdout: '    (Default)    REG_SZ    C:\\OtherUser\\countdown.exe\r\n' });
    await handleStartupEvent();
    expect(run.mock.calls.some(call => call[1][0] === 'delete')).toBe(false);
  });

  it('allows uninstalling versions without an App Paths entry', async () => {
    process.argv[1] = '--squirrel-uninstall';
    run.mockResolvedValueOnce({}).mockRejectedValueOnce({ code: 1 });
    expect(await handleStartupEvent()).toBe(true);
  });

  it('reports installer command failures', async () => {
    run.mockRejectedValueOnce(new Error('Updater failed'));
    await expect(handleStartupEvent()).rejects.toThrow('Updater failed');
  });

  it.each(['--squirrel-firstrun', undefined])('leaves normal startup untouched (%s)', async command => {
    process.argv[1] = command as string;
    expect(await handleStartupEvent()).toBe(false);
    expect(run).not.toHaveBeenCalled();
  });

  it('quits an obsolete version without removing shared registration', async () => {
    process.argv[1] = '--squirrel-obsolete';
    expect(await handleStartupEvent()).toBe(true);
    expect(run).not.toHaveBeenCalled();
  });

  it('does nothing on other platforms', async () => {
    vi.stubGlobal('process', { ...process, platform: 'linux' });
    expect(await handleStartupEvent()).toBe(false);
    expect(run).not.toHaveBeenCalled();
  });
});

