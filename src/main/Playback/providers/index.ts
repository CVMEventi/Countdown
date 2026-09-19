import {VMIX_PROVIDER_ID} from "@common/playback.ts";
import type {PlaybackProviderFactory} from "../PlaybackProvider.ts";
import {VMixProvider} from "./vmix/VMixProvider.ts";

// The one main process file a new provider has to touch, alongside its meta in common/playback.ts
export const playbackProviderFactories: {[providerId: string]: PlaybackProviderFactory} = {
  [VMIX_PROVIDER_ID]: (context) => new VMixProvider(context),
}
