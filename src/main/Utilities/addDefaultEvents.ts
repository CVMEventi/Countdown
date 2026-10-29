import {app} from "electron";

export default function addDefaultEvents() {
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
