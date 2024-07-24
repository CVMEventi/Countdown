import {BaseMigration} from "./BaseMigration.ts";
import {ContentAtReset} from "../../common/config.ts";

export class MoveBlackAtResetToContentAtReset implements BaseMigration {
  migrate(oldConfig: { [key: string]: unknown }): { [key: string]: unknown } {
    const settings = oldConfig.settings as {[key: string]: unknown};

    if (oldConfig.version) return oldConfig;

    if(!('blackAtReset' in settings)) return oldConfig;

    if (settings.blackAtReset) settings.contentAtReset = ContentAtReset.Empty;
    delete settings.blackAtReset;

    return {
      ...oldConfig,
      settings,
    };
  }

}
