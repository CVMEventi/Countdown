import { app } from 'electron';
import installExtension from 'electron-devtools-installer';

// The package ships ESM types but publishes CJS, so tsc sees the namespace rather than the
// callable default.
const install = installExtension as unknown as (reference: {id: string, electron: string}) => Promise<string>;

const VUEJS3_DEVTOOLS = {
  id: 'nhdogjmejiglipccpnnnanhbledajbpd',
  electron: '>=1.2.1'
}

function enableDevMode() {
  app.whenReady().then(() => {
    install(VUEJS3_DEVTOOLS)
      .then((name: string) => console.log(`Added Extension:  ${name}`))
      .catch((err: unknown) => console.log('An error occurred: ', err));
  });
}

const isDev = process.env.NODE_ENV === 'development'

export {
  enableDevMode,
  isDev,
}
