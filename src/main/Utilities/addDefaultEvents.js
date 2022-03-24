import {app, ipcMain, screen} from "electron";

export default function addDefaultEvents() {
  // Handle creating/removing shortcuts on Windows when installing/uninstalling.
  if (require('electron-squirrel-startup')) {
    // eslint-disable-line global-require
    app.quit();
  }

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
