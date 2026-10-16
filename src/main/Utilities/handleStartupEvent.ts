import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

function installationPaths() {
  const executable = path.basename(process.execPath);
  const installDirectory = path.resolve(path.dirname(process.execPath), '..');
  return {
    executable, installDirectory,
    updater: path.join(installDirectory, 'Update.exe'),
    launcher: path.join(installDirectory, executable),
    registry: path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'reg.exe'),
    key: `HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\${executable}`,
  };
}

async function registerAppPath() {
  const { registry, key, launcher, installDirectory } = installationPaths();
  async function write(target: string) {
    await run(registry, ['add', target, '/ve', '/t', 'REG_SZ', '/d', launcher, '/f'], { windowsHide: true });
    await run(registry, ['add', target, '/v', 'Path', '/t', 'REG_SZ', '/d', installDirectory, '/f'], { windowsHide: true });
  }
  try {
    await write(key);
  } catch (error) {
    // Standard user installations do not have permission to write HKLM.
    if ((error as { code?: number }).code !== 1) throw error;
    await write(key.replace(/^HKLM/, 'HKCU'));
  }
}

export async function ensureInstalledAppPath(): Promise<void> {
  if (process.platform !== 'win32') return;
  const { registry, key, updater, launcher } = installationPaths();
  // Portable and development copies must not replace an installed app's entry.
  if (!/^app-/i.test(path.basename(path.dirname(process.execPath))) || !existsSync(updater) || !existsSync(launcher)) return;
  try {
    const { stdout } = await run(registry, ['query', key, '/ve'], { windowsHide: true });
    const registered = stdout.match(/REG_SZ\s+([^\r\n]+)/)?.[1].trim();
    if (registered?.toLowerCase() === launcher.toLowerCase()) return;
  } catch (error) {
    if ((error as { code?: number }).code !== 1) throw error;
  }
  await registerAppPath();
}

export async function handleStartupEvent(): Promise<boolean> {
  if (process.platform !== 'win32') return false;

  const command = process.argv[1];
  if (!['--squirrel-install', '--squirrel-updated', '--squirrel-uninstall', '--squirrel-obsolete'].includes(command)) return false;
  if (command === '--squirrel-obsolete') return true;

  const { executable, updater, registry, key, launcher } = installationPaths();
  const options = { windowsHide: true };

  if (command === '--squirrel-uninstall') {
    await run(updater, ['--removeShortcut', executable], options);
    for (const target of [key, key.replace(/^HKLM/, 'HKCU')]) {
      try {
        const { stdout } = await run(registry, ['query', target, '/ve'], options);
        const registered = stdout.match(/REG_SZ\s+([^\r\n]+)/)?.[1].trim();
        // Leave another user's installation registered if it replaced this one.
        if (registered?.toLowerCase() === launcher.toLowerCase()) {
          await run(registry, ['delete', target, '/f'], options);
        }
      } catch (error) {
        // Missing entries and inaccessible machine entries need no cleanup.
        if ((error as { code?: number }).code !== 1) throw error;
      }
    }
  } else {
    // Squirrel's default locations are Desktop and StartMenu.
    await run(updater, ['--createShortcut', executable], options);
    // The root launcher survives replacement of versioned app directories.
    await registerAppPath();
  }
  return true;
}
