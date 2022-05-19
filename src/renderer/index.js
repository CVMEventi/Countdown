import "v8-compile-cache";
import './index.css';
import { createApp } from 'vue';
import Index from './pages/index';
import Countdown from './pages/countdown';
import App from './App';
import { createRouter, createWebHashHistory } from 'vue-router';

console.log('👋 This message is being logged by "index.js", included via webpack');

const routes = [
  { path: '/countdown', component: Countdown },
  { path: '/control/:tab?', component: Index, props: (route) => ({ tab: route.params.tab || 'main' }) },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

const app = createApp(App)
app.use(router);
app.mount('#app')
