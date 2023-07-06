import grandiose, {FourCC, FrameType, VideoFrame} from "grandiose";
import * as process from "process";
import os from "os";
import ImageBufferAdjustment from "../Utilities/ImageBufferAdjustment";
import NativeImage = Electron.NativeImage;

export default class NDIManager {
  name: string = "";
  ndiSender: grandiose.Sender = null;
  timeStart: bigint = null;
  alpha = false;

  constructor(name: string) {
    this.name = name;
  }

  async start() {
    if (this.ndiSender) return;
    grandiose.initialize();
    this.ndiSender = await grandiose.send({
      name: this.name,
      clockVideo: false,
      clockAudio: false
    })
    this.timeStart = (BigInt(Date.now()) * BigInt(1e6) - process.hrtime.bigint())
  }

  async stop() {
    if (!this.ndiSender) return;
    await this.ndiSender.destroy();
    this.ndiSender = null;
    grandiose.destroy();
  }

  _timeNow(): bigint {
    return this.timeStart + process.hrtime.bigint();
  }

  /**
   * @param {electron.NativeImage} image
   */
  async sendFrame(image: NativeImage) {
    const size = image.getSize();
    const buffer = image.getBitmap();
    /*
    convert from ARGB (Electron/Chromium on big endian CPU)
    to BGRA (supported input of NDI SDK). On little endian
    CPU the input is already BGRA.
    */
    if (os.endianness() === "BE") {
      ImageBufferAdjustment.ARGBtoBGRA(buffer)
    }

    /*  optionally convert from BGRA to BGRX (no alpha channel)  */
    let fourCC = FourCC.BGRA;
    if (!this.alpha) { // no alpha
      ImageBufferAdjustment.BGRAtoBGRX(buffer)
      fourCC = FourCC.BGRX;
    }

    /*  send NDI video frame  */
    const now = this._timeNow()
    const bytesForBGRA = 4
    const frame: VideoFrame = {
      type: 'video',
      /*  base information  */
      timecode: now / BigInt(100),

      /*  type-specific information  */
      xres: size.width,
      yres: size.height,
      frameRateN: 30 * 1000,
      frameRateD: 1000,
      pictureAspectRatio: size.width / size.height,
      frameFormatType: FrameType.Progressive,
      lineStrideBytes: size.width * bytesForBGRA,

      /*  the data itself  */
      fourCC,
      data: buffer
    }
    await this.ndiSender.video(frame)
  }
}
