import { app } from 'electron';
import installExtension from 'electron-devtools-installer';

const VUEJS3_DEVTOOLS = {
  id: 'nhdogjmejiglipccpnnnanhbledajbpd',
  electron: '>=1.2.1'
}

function enableDevMode() {
  app.whenReady().then(() => {
    installExtension(VUEJS3_DEVTOOLS)
      .then((name) => console.log(`Added Extension:  ${name}`))
      .catch((err) => console.log('An error occurred: ', err));
  });
}

const isDev = process.env.NODE_ENV === 'development'

export {
  enableDevMode,
  isDev,
}
