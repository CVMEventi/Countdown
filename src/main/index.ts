import "v8-compile-cache";
import { CountdownApp } from './App';
import updater from "update-electron-app";
updater({
  updateInterval: '8 hours',
});

const countdownApp = new CountdownApp();
countdownApp.run()
