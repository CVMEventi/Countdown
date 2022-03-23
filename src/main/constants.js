const STORE_DEFAULTS = {
  defaults: {
    settings: {
      backgroundColor: '#000000',
      textColor: '#ffffff',
      timerFinishedTextColor: '',
      clockColor: '#ffffff',
      clockTextColor: '#ffffff',
      presets: [
        5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60
      ],
      webServerEnabled: true,
      webServerPort: 6565,
    },
    window: {
      x: 0,
      y: 0,
      width: 1280,
      height: 720
    }
  }
};

export {
  STORE_DEFAULTS,
}
