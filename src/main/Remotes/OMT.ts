import { Sender, FrameType, Codec, VideoFlags, MediaFrame } from "openmediatransport";
import os from "os";
import ImageBufferAdjustment from "../Utilities/ImageBufferAdjustment.js";
import NativeImage = Electron.NativeImage;

export default class OMTManager {
  name = "";
  omtSender: Sender | null = null;

  constructor(name: string) {
    this.name = name;
  }

  start() {
    if (this.omtSender) return;
    this.omtSender = new Sender(this.name);
  }

  stop() {
    if (!this.omtSender) return;
    this.omtSender.destroy();
    this.omtSender = null;
  }

  async sendFrame(image: NativeImage) {
    const size = image.getSize();
    const buffer = image.toBitmap();

    if (os.endianness() === "BE") {
      ImageBufferAdjustment.ARGBtoBGRA(buffer);
    }

    const frame: MediaFrame = {
      type: FrameType.Video,
      timestamp: BigInt(-1),
      codec: Codec.BGRA,
      flags: VideoFlags.Alpha,
      width: size.width,
      height: size.height,
      stride: size.width * 4,
      frameRateN: 30,
      frameRateD: 1,
      aspectRatio: size.width / size.height,
      data: buffer,
    };

    this.omtSender?.send(frame);
  }

  hasConnections(): boolean {
    if (!this.omtSender) return false;
    return this.omtSender.connections > 0;
  }
}
