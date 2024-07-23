import {MergeOpacityToBackgroundColor} from "./MergeOpacityToBackgroundColor";
import {BaseMigration} from "./BaseMigration";
import {MoveBlackAtResetToContentAtReset} from "./MoveBlackAtResetToContentAtReset";
import {RemoveFont} from "./RemoveFont";
import {MoveSettingsToWindow} from "./MoveSettingsToWindow";

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
