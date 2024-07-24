import {BaseMigration} from "./BaseMigration.ts";

export class RemoveFont implements BaseMigration {
  migrate(oldConfig: { [key: string]: unknown }): { [key: string]: unknown } {
    const settings = oldConfig.settings as {[key: string]: unknown};

    if (oldConfig.version) return oldConfig;

    delete settings.font;

    return {
      ...oldConfig,
      settings,
    };
  }

}
