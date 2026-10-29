import './index.css';
import { createApp } from 'vue';
import App from './App.vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import type {RouteRecordRaw} from 'vue-router';
import {createPinia} from "pinia";
import { vNoWheel } from '../common/directives/noWheel.ts';

const routes: RouteRecordRaw[] = [
  { path: '/countdown', component: () => import('./pages/Countdown.vue').then(module => module.default) },
  { path: '/webrtc-host', component: () => import('./pages/WebRtcHost.vue').then(module => module.default) },
  {
    path: '/', component: () => import('./components/ControlShell.vue').then(module => module.default),
    children: [
      { path: 'control', component: () => import('./pages/Control.vue').then(module => module.default) },
      { path: 'settings/timers', component: () => import('./pages/TimersSettings.vue').then(module => module.default) },
      { path: 'settings/remote', component: () => import('./pages/RemoteSettings.vue').then(module => module.default) },
      { path: 'settings/general', component: () => import('./pages/GeneralSettings.vue').then(module => module.default) },
    ],
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)
app.directive('no-wheel', vNoWheel);
app.use(router)
router.isReady().then(() => app.mount('#app'))
