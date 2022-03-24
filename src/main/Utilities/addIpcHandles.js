import {ipcMain, screen} from "electron";

export default function addIpcHandles()
{
  ipcMain.handle('get-screens', (event, ...args) => {
    return screen.getAllDisplays()
  })
}
