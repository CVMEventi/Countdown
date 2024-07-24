import {BaseMigration} from "./BaseMigration.ts";

export class MergeOpacityToBackgroundColor implements BaseMigration {
  migrate(oldConfig: { [key: string]: unknown }): { [key: string]: unknown } {
    const settings = oldConfig.settings as {[key: string]: unknown};

    if (oldConfig.version) return oldConfig;

    if (!settings.backgroundColorOpacity) return oldConfig;
    if (!settings.backgroundColor) return oldConfig;
    if ((settings.backgroundColor as string).length > 8) return oldConfig;

    settings.backgroundColor = settings.backgroundColor + parseInt(settings.backgroundColorOpacity as string).toString(16).padStart(2, "0");
    delete settings.backgroundColorOpacity;

    return {
      ...oldConfig,
      settings,
    };
  }

}
