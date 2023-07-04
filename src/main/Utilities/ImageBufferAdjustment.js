/*  helper class for adjusting image buffer byte orders  */
export default class ImageBufferAdjustment {
  /*  convert between ARGB and BGRA  */
  static ARGBtoBGRA (data) {
    for (let i = 0; i < data.length; i += 4) {
      const A = data[i]
      data[i] = data[i + 3]
      data[i + 3] = A
      const R = data[i + 1]
      data[i + 1] = data[i + 2]
      data[i + 2] = R
    }
  }

  /*  convert from ARGB to RGBA  */
  static ARGBtoRGBA (data) {
    for (let i = 0; i < data.length; i += 4) {
      const A = data[i]
      data[i] = data[i + 1]
      data[i + 1] = data[i + 2]
      data[i + 2] = data[i + 3]
      data[i + 3] = A
    }
  }

  /*  convert from BGRA to RGBA  */
  static BGRAtoRGBA (data) {
    for (let i = 0; i < data.length; i += 4) {
      const B = data[i]
      data[i] = data[i + 2]
      data[i + 2] = B
    }
  }

  /*  convert from BGRA to BGRX  */
  static BGRAtoBGRX (data) {
    for (let i = 0; i < data.length; i += 4)
      data[i + 3] = 255
  }
}
