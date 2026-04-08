import { describe, it, expect } from 'vitest';
import { applyMigrations } from '../../main/Migrations/applyMigrations.ts';
import { MergeOpacityToBackgroundColor } from '../../main/Migrations/MergeOpacityToBackgroundColor.ts';
import { MoveBlackAtResetToContentAtReset } from '../../main/Migrations/MoveBlackAtResetToContentAtReset.ts';
import { RemoveFont } from '../../main/Migrations/RemoveFont.ts';
import { MoveSettingsToWindow } from '../../main/Migrations/MoveSettingsToWindow.ts';
import { MigrateToColorThresholds } from '../../main/Migrations/MigrateToColorThresholds.ts';
import { ContentAtReset } from '../../common/config.ts';

// ─────────────────────────────────────────────────────────────
// MergeOpacityToBackgroundColor
// ─────────────────────────────────────────────────────────────
describe('MergeOpacityToBackgroundColor', () => {
  const migration = new MergeOpacityToBackgroundColor();

  it('returns config unchanged when version is already set', () => {
    const config = { version: 1, settings: { backgroundColor: '#000000', backgroundColorOpacity: '255' } };
    expect(migration.migrate(config)).toBe(config);
  });

  it('returns config unchanged when backgroundColorOpacity is absent', () => {
    const config = { settings: { backgroundColor: '#000000' } };
    expect(migration.migrate(config)).toEqual(config);
  });

  it('returns config unchanged when backgroundColor is absent', () => {
    const config = { settings: { backgroundColorOpacity: '255' } };
    expect(migration.migrate(config)).toEqual(config);
  });

  it('returns config unchanged when backgroundColor already has an alpha channel (length > 8)', () => {
    const config = { settings: { backgroundColor: '#000000ff', backgroundColorOpacity: '255' } };
    expect(migration.migrate(config)).toEqual(config);
  });

  it('merges opacity 255 → "ff" into backgroundColor', () => {
    const config = { settings: { backgroundColor: '#000000', backgroundColorOpacity: '255' } };
    const result = migration.migrate(config);
    expect((result.settings as Record<string, unknown>).backgroundColor).toBe('#000000ff');
  });

  it('merges opacity 128 → "80" into backgroundColor', () => {
    const config = { settings: { backgroundColor: '#aabbcc', backgroundColorOpacity: '128' } };
    const result = migration.migrate(config);
    expect((result.settings as Record<string, unknown>).backgroundColor).toBe('#aabbcc80');
  });

  it('removes backgroundColorOpacity after merge', () => {
    const config = { settings: { backgroundColor: '#000000', backgroundColorOpacity: '255' } };
    const result = migration.migrate(config);
    expect((result.settings as Record<string, unknown>).backgroundColorOpacity).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────
// MoveBlackAtResetToContentAtReset
// ─────────────────────────────────────────────────────────────
describe('MoveBlackAtResetToContentAtReset', () => {
  const migration = new MoveBlackAtResetToContentAtReset();

  it('returns config unchanged when version is already set', () => {
    const config = { version: 1, settings: { blackAtReset: true } };
    expect(migration.migrate(config)).toBe(config);
  });

  it('returns config unchanged when blackAtReset key is absent', () => {
    const config = { settings: { other: true } };
    expect(migration.migrate(config)).toEqual(config);
  });

  it('sets contentAtReset to Empty when blackAtReset is true', () => {
    const config = { settings: { blackAtReset: true } };
    const result = migration.migrate(config);
    expect((result.settings as Record<string, unknown>).contentAtReset).toBe(ContentAtReset.Empty);
  });

  it('does not set contentAtReset when blackAtReset is false', () => {
    const config = { settings: { blackAtReset: false } };
    const result = migration.migrate(config);
    expect((result.settings as Record<string, unknown>).contentAtReset).toBeUndefined();
  });

  it('removes blackAtReset in either case', () => {
    for (const val of [true, false]) {
      const config = { settings: { blackAtReset: val } };
      const result = migration.migrate(config);
      expect((result.settings as Record<string, unknown>).blackAtReset).toBeUndefined();
    }
  });
});

// ─────────────────────────────────────────────────────────────
// RemoveFont
// ─────────────────────────────────────────────────────────────
describe('RemoveFont', () => {
  const migration = new RemoveFont();

  it('returns config unchanged when version is already set', () => {
    const config = { version: 1, settings: { font: 'Arial' } };
    expect(migration.migrate(config)).toBe(config);
  });

  it('removes font from settings', () => {
    const config = { settings: { font: 'Arial', other: 'value' } };
    const result = migration.migrate(config);
    expect((result.settings as Record<string, unknown>).font).toBeUndefined();
  });

  it('preserves other settings keys', () => {
    const config = { settings: { font: 'Arial', other: 'value' } };
    const result = migration.migrate(config);
    expect((result.settings as Record<string, unknown>).other).toBe('value');
  });

  it('is a no-op when font is absent', () => {
    const config = { settings: { other: 'value' } };
    const result = migration.migrate(config);
    expect(result).toEqual(config);
  });
});

// ─────────────────────────────────────────────────────────────
// MoveSettingsToWindow
// ─────────────────────────────────────────────────────────────
describe('MoveSettingsToWindow', () => {
  const migration = new MoveSettingsToWindow();

  it('returns config unchanged when version >= 2 and timers exist', () => {
    const config = { version: 2, settings: { timers: { t1: {} } } };
    expect(migration.migrate(config)).toBe(config);
  });

  it('restructures v1 flat config into nested timers/windows format', () => {
    const oldSettings = {
      presets: [5, 10],
      webServerEnabled: true,
      webServerPort: 6565,
      ndiEnabled: false,
      ndiAlpha: false,
      oscEnabled: false,
      oscPort: 6566,
      setWindowAlwaysOnTop: false,
      timerAlwaysOnTop: false,
      timerDuration: 1000,
      setTimeLive: false,
      stopTimerAtZero: false,
      yellowAtOption: 'minutes',
      yellowAtMinutes: 2,
      yellowAtPercent: 10,
      show: { timer: true, progress: true },
      showHours: false,
      messageBoxFixedHeight: false,
      contentAtReset: ContentAtReset.Full,
      backgroundColor: '#000000ff',
      resetBackgroundColor: '#000000ff',
      textColor: '#ffffff',
      timerFinishedTextColor: '#ff0000',
      clockColor: '#ffffff',
      clockTextColor: '#ffffff',
      pulseAtZero: false,
      use12HourClock: false,
    };
    const config = { settings: oldSettings, window: { x: 100, y: 100, width: 1280, height: 720 } };
    const result = migration.migrate(config) as Record<string, unknown>;

    expect(result.version).toBe(2);
    const settings = result.settings as Record<string, unknown>;
    expect(settings.presets).toEqual([5, 10]);

    // Should have a remote sub-object
    const remote = settings.remote as Record<string, unknown>;
    expect(remote.webServerEnabled).toBe(true);
    expect(remote.webServerPort).toBe(6565);

    // Should have a timers object with one entry
    const timers = settings.timers as Record<string, unknown>;
    const timerEntries = Object.values(timers);
    expect(timerEntries).toHaveLength(1);

    const timer = timerEntries[0] as Record<string, unknown>;
    expect(timer.timerDuration).toBe(1000);

    // Window with bounds
    const windows = timer.windows as Record<string, unknown>;
    const windowEntries = Object.values(windows);
    expect(windowEntries).toHaveLength(1);

    const win = windowEntries[0] as Record<string, unknown>;
    const bounds = win.bounds as Record<string, unknown>;
    expect(bounds.alwaysOnTop).toBe(false);
    expect(bounds.x).toBe(100);
  });
});

// ─────────────────────────────────────────────────────────────
// MigrateToColorThresholds
// ─────────────────────────────────────────────────────────────
describe('MigrateToColorThresholds', () => {
  const migration = new MigrateToColorThresholds();

  it('returns config unchanged when version >= 3', () => {
    const config = { version: 3, settings: {} };
    expect(migration.migrate(config)).toBe(config);
  });

  it('bumps version to 3', () => {
    const config = {
      version: 2,
      settings: {
        timers: {
          t1: {
            yellowAtOption: 'minutes',
            yellowAtMinutes: 2,
            yellowAtPercent: 10,
            windows: {
              w1: { colors: {} },
            },
          },
        },
      },
    };
    const result = migration.migrate(config);
    expect(result.version).toBe(3);
  });

  it('removes yellow threshold fields from timer', () => {
    const config = {
      version: 2,
      settings: {
        timers: {
          t1: {
            yellowAtOption: 'minutes',
            yellowAtMinutes: 2,
            yellowAtPercent: 10,
            name: 'Timer',
            windows: { w1: { colors: {} } },
          },
        },
      },
    };
    const result = migration.migrate(config) as Record<string, unknown>;
    const timers = (result.settings as Record<string, unknown>).timers as Record<string, unknown>;
    const timer = Object.values(timers)[0] as Record<string, unknown>;
    expect(timer.yellowAtOption).toBeUndefined();
    expect(timer.yellowAtMinutes).toBeUndefined();
    expect(timer.yellowAtPercent).toBeUndefined();
    expect(timer.name).toBe('Timer');
  });

  it('adds thresholds array to each window colors', () => {
    const config = {
      version: 2,
      settings: {
        timers: {
          t1: {
            yellowAtOption: 'minutes',
            yellowAtMinutes: 3,
            yellowAtPercent: 10,
            windows: { w1: { colors: { background: '#111111ff' } } },
          },
        },
      },
    };
    const result = migration.migrate(config) as Record<string, unknown>;
    const timers = (result.settings as Record<string, unknown>).timers as Record<string, unknown>;
    const timer = Object.values(timers)[0] as Record<string, unknown>;
    const windows = timer.windows as Record<string, unknown>;
    const win = Object.values(windows)[0] as Record<string, unknown>;
    const colors = win.colors as Record<string, unknown>;

    expect(Array.isArray(colors.thresholds)).toBe(true);
    const thresholds = colors.thresholds as Array<Record<string, unknown>>;
    expect(thresholds).toHaveLength(1);
    expect(thresholds[0].type).toBe('minutes');
    expect(thresholds[0].value).toBe(3);
  });

  it('uses percent threshold when yellowAtOption is "percent"', () => {
    const config = {
      version: 2,
      settings: {
        timers: {
          t1: {
            yellowAtOption: 'percent',
            yellowAtMinutes: 2,
            yellowAtPercent: 25,
            windows: { w1: { colors: {} } },
          },
        },
      },
    };
    const result = migration.migrate(config) as Record<string, unknown>;
    const timers = (result.settings as Record<string, unknown>).timers as Record<string, unknown>;
    const timer = Object.values(timers)[0] as Record<string, unknown>;
    const windows = timer.windows as Record<string, unknown>;
    const win = Object.values(windows)[0] as Record<string, unknown>;
    const colors = win.colors as Record<string, unknown>;
    const thresholds = colors.thresholds as Array<Record<string, unknown>>;
    expect(thresholds[0].type).toBe('percent');
    expect(thresholds[0].value).toBe(25);
  });
});

// ─────────────────────────────────────────────────────────────
// applyMigrations — integration
// ─────────────────────────────────────────────────────────────
describe('applyMigrations', () => {
  it('runs all migrations in order on a fully unversioned config', () => {
    const oldConfig = {
      window: { x: 0, y: 0, width: 1280, height: 720 },
      settings: {
        backgroundColor: '#ff0000',
        backgroundColorOpacity: '128',
        blackAtReset: true,
        font: 'Comic Sans',
        presets: [5],
        webServerEnabled: true,
        webServerPort: 6565,
        ndiEnabled: false,
        ndiAlpha: false,
        oscEnabled: false,
        oscPort: 6566,
        setWindowAlwaysOnTop: false,
        timerAlwaysOnTop: false,
        timerDuration: 1000,
        setTimeLive: false,
        stopTimerAtZero: false,
        yellowAtOption: 'minutes',
        yellowAtMinutes: 2,
        yellowAtPercent: 10,
        show: { timer: true, progress: true },
        showHours: false,
        messageBoxFixedHeight: false,
        contentAtReset: ContentAtReset.Full,
        textColor: '#ffffff',
        timerFinishedTextColor: '#ff0000',
        clockColor: '#ffffff',
        clockTextColor: '#ffffff',
        pulseAtZero: false,
        use12HourClock: false,
      },
    };

    const result = applyMigrations(oldConfig) as Record<string, unknown>;

    // Version should be bumped to 3 by MigrateToColorThresholds
    expect(result.version).toBe(3);

    const settings = result.settings as Record<string, unknown>;

    // font removed
    expect(settings.font).toBeUndefined();

    // timers restructured
    const timers = settings.timers as Record<string, unknown>;
    expect(Object.keys(timers)).toHaveLength(1);

    const timer = Object.values(timers)[0] as Record<string, unknown>;
    expect(timer.yellowAtOption).toBeUndefined();

    // window colors now include thresholds
    const windows = timer.windows as Record<string, unknown>;
    const win = Object.values(windows)[0] as Record<string, unknown>;
    const colors = win.colors as Record<string, unknown>;
    expect(Array.isArray(colors.thresholds)).toBe(true);
  });

  it('is idempotent on a fully migrated config (version 3)', () => {
    const migrated = {
      version: 3,
      settings: {
        timers: {},
        presets: [],
        remote: {},
        setWindowAlwaysOnTop: false,
        closeAction: 'ASK',
        startHidden: false,
      },
    };
    const result = applyMigrations(migrated);
    expect(result).toEqual(migrated);
  });
});
