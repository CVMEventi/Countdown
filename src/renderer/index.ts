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
