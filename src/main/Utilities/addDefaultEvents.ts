import {app} from "electron";
import { handleStartupEvent } from './handleStartupEvent.ts'

export default function addDefaultEvents() {
  // Handle creating/removing shortcuts on Windows when installing/uninstalling.
  if (handleStartupEvent()) {
    app.quit();
  }

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
