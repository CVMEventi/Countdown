import {BaseMigration} from "./BaseMigration";

export class RemoveFont implements BaseMigration {
  migrate(oldConfig: { [key: string]: unknown }): { [key: string]: unknown } {
    const settings = oldConfig.settings as {[key: string]: unknown};

    delete settings.font;

    return {
      ...oldConfig,
      settings,
    };
  }

}
