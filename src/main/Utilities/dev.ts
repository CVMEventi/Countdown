import { app } from 'electron';
import installExtension, { VUEJS3_DEVTOOLS } from 'electron-devtools-installer';

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
