import {MergeOpacityToBackgroundColor} from "./MergeOpacityToBackgroundColor.ts";
import {BaseMigration} from "./BaseMigration.ts";
import {MoveBlackAtResetToContentAtReset} from "./MoveBlackAtResetToContentAtReset.ts";
import {RemoveFont} from "./RemoveFont.ts";
import {MoveSettingsToWindow} from "./MoveSettingsToWindow.ts";

const migrations: BaseMigration[] = [
  new MergeOpacityToBackgroundColor,
  new MoveBlackAtResetToContentAtReset,
  new RemoveFont,
  new MoveSettingsToWindow,
];

export function applyMigrations(oldConfig: {[key: string]: unknown}): {[key: string]: unknown} {

  let config = oldConfig;

  migrations.forEach((migration) => {
    config = migration.migrate(config);
  })

  return config;
}
