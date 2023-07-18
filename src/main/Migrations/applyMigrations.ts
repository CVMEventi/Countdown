import {MergeOpacityToBackgroundColor} from "./MergeOpacityToBackgroundColor";
import {BaseMigration} from "./BaseMigration";

const migrations: BaseMigration[] = [
  new MergeOpacityToBackgroundColor,
];

export function applyMigrations(oldConfig: {[key: string]: unknown}): {[key: string]: unknown} {

  let config = oldConfig;

  migrations.forEach((migration) => {
    config = migration.migrate(config);
  })

  return config;
}
