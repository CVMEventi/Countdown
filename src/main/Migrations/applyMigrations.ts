import {MergeOpacityToBackgroundColor} from "./MergeOpacityToBackgroundColor.ts";
import {BaseMigration} from "./BaseMigration.ts";
import {MoveBlackAtResetToContentAtReset} from "./MoveBlackAtResetToContentAtReset.ts";
import {RemoveFont} from "./RemoveFont.ts";
import {MoveSettingsToWindow} from "./MoveSettingsToWindow.ts";
import {MigrateToColorThresholds} from "./MigrateToColorThresholds.ts";
import {AddWebRtcRemoteSettings} from "./AddWebRtcRemoteSettings.ts";
import {SetDefaultWebRtcSpaUrl} from "./SetDefaultWebRtcSpaUrl.ts";
import {AddPlaybackSettings} from "./AddPlaybackSettings.ts";
import {PlaybackProvidersToSources} from "./PlaybackProvidersToSources.ts";

const migrations: BaseMigration[] = [
  new MergeOpacityToBackgroundColor,
  new MoveBlackAtResetToContentAtReset,
  new RemoveFont,
  new MoveSettingsToWindow,
  new MigrateToColorThresholds,
  new AddWebRtcRemoteSettings,
  new SetDefaultWebRtcSpaUrl,
  new AddPlaybackSettings,
  new PlaybackProvidersToSources,
];

export function applyMigrations(oldConfig: {[key: string]: unknown}): {[key: string]: unknown} {

  let config = oldConfig;

  migrations.forEach((migration) => {
    config = migration.migrate(config);
  })

  return config;
}
