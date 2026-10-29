import { execFile } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
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
    // Lives in the install root, which updates keep and uninstall removes.
    shortcutsMarker: path.join(installDirectory, '.shortcuts-created'),
    registry: path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'reg.exe'),
    key: `HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\${executable}`,
  };
}

async function registeredPath(target: string): Promise<string | undefined> {
  const { registry } = installationPaths();
  try {
    const { stdout } = await run(registry, ['query', target, '/ve'], { windowsHide: true });
    return stdout.match(/REG_SZ\s+([^\r\n]+)/)?.[1].trim();
  } catch (error) {
    // Missing entries and inaccessible machine entries are reported as code 1.
    if ((error as { code?: number }).code !== 1) throw error;
    return undefined;
  }
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
  const { key, updater, launcher } = installationPaths();
  // Portable and development copies must not replace an installed app's entry.
  if (!/^app-/i.test(path.basename(path.dirname(process.execPath))) || !existsSync(updater) || !existsSync(launcher)) return;
  // Standard user installations are registered under HKCU, so check both hives
  // instead of registering again on every launch.
  for (const target of [key, key.replace(/^HKLM/, 'HKCU')]) {
    if ((await registeredPath(target))?.toLowerCase() === launcher.toLowerCase()) return;
  }
  await registerAppPath();
}

export async function handleStartupEvent(): Promise<boolean> {
  if (process.platform !== 'win32') return false;

  const command = process.argv[1];
  if (!['--squirrel-install', '--squirrel-updated', '--squirrel-uninstall', '--squirrel-obsolete'].includes(command)) return false;
  if (command === '--squirrel-obsolete') return true;

  const { executable, updater, registry, key, launcher, shortcutsMarker } = installationPaths();
  const options = { windowsHide: true };

  if (command === '--squirrel-uninstall') {
    await run(updater, ['--removeShortcut', executable], options);
    for (const target of [key, key.replace(/^HKLM/, 'HKCU')]) {
      // Leave another user's installation registered if it replaced this one.
      if ((await registeredPath(target))?.toLowerCase() === launcher.toLowerCase()) {
        await run(registry, ['delete', target, '/f'], options);
      }
    }
  } else {
    // Create shortcuts once: on install, or on the first update for copies installed
    // before shortcuts were created. Later updates must not bring back shortcuts the
    // user deleted; existing ones target the root launcher and survive updates.
    if (command === '--squirrel-install' || !existsSync(shortcutsMarker)) {
      // Squirrel's default locations are Desktop and StartMenu.
      await run(updater, ['--createShortcut', executable], options);
      writeFileSync(shortcutsMarker, '');
    }
    // The root launcher survives replacement of versioned app directories.
    await registerAppPath();
  }
  return true;
}
