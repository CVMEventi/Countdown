import {BaseMigration} from "./BaseMigration";
import {ContentAtReset} from "../../common/config";

export class MoveBlackAtResetToContentAtReset implements BaseMigration {
  migrate(oldConfig: { [key: string]: unknown }): { [key: string]: unknown } {
    const settings = oldConfig.settings as {[key: string]: unknown};

    if(!('blackAtReset' in settings)) return oldConfig;

    if (settings.blackAtReset) settings.contentAtReset = ContentAtReset.Empty;
    delete settings.blackAtReset;

    return {
      ...oldConfig,
      settings,
    };
  }

}
