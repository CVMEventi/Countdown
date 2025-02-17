import "v8-compile-cache";
import './index.css';
import { createApp } from 'vue';
import Control from './pages/Control.vue';
import Countdown from './pages/Countdown.vue';
import App from './App.vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import {createPinia} from "pinia";
import TimersSettings from './pages/TimersSettings.vue'
import RemoteSettings from './pages/RemoteSettings.vue'
import GeneralSettings from './pages/GeneralSettings.vue'
import {useSettingsStore} from './stores/settings.ts'
import {useGlobalStore} from './stores/global.ts'
import {useTimersStore} from './stores/timers.ts'
import {usePiniaWebpackHotHMR} from './piniaHmr.ts'

if (import.meta.webpackHot) {
  usePiniaWebpackHotHMR(import.meta.webpackHot, [useSettingsStore, useGlobalStore, useTimersStore]);
}

const routes = [
  { path: '/countdown', component: Countdown },
  { path: '/control', component: Control },
  { path: '/settings/timers', component: TimersSettings },
  { path: '/settings/remote', component: RemoteSettings },
  { path: '/settings/general', component: GeneralSettings },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)
app.use(router)
app.mount('#app')
