import "v8-compile-cache";
import { CountdownApp } from './App';
import { updateElectronApp } from "update-electron-app";
updateElectronApp({
  updateInterval: '8 hours'
})

const countdownApp = new CountdownApp();
countdownApp.run()
