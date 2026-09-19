import {MILLUMIN_PROVIDER_ID, QLAB_PROVIDER_ID, VMIX_PROVIDER_ID} from "@common/playback.ts";
import type {PlaybackProviderFactory} from "../PlaybackProvider.ts";
import {VMixProvider} from "./vmix/VMixProvider.ts";
import {MilluminProvider} from "./millumin/MilluminProvider.ts";
import {QLabProvider} from "./qlab/QLabProvider.ts";

// The one main process file a new provider has to touch, alongside its meta in common/playback.ts
export const playbackProviderFactories: {[providerId: string]: PlaybackProviderFactory} = {
  [VMIX_PROVIDER_ID]: (context) => new VMixProvider(context),
  [MILLUMIN_PROVIDER_ID]: (context) => new MilluminProvider(context),
  [QLAB_PROVIDER_ID]: (context) => new QLabProvider(context),
}
