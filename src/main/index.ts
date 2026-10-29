import { app } from 'electron';
import { ensureInstalledAppPath, handleStartupEvent } from './Utilities/handleStartupEvent.ts';

async function main() {
  // Finish installer operations before quitting, without starting the application.
  if (await handleStartupEvent()) {
    app.quit();
    return;
  }

  if (app.isPackaged) {
    void ensureInstalledAppPath().catch(error => console.error('Could not register Countdown App Path:', error));
  }
  const { CountdownApp } = await import('./App.ts');
  const { updateElectronApp } = await import('update-electron-app');
  updateElectronApp({ updateInterval: '8 hours' });
  const countdownApp = new CountdownApp();
  countdownApp.run();
}

main().catch(error => {
  console.error('Countdown startup failed:', error);
  app.exit(1);
});
