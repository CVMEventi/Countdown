import "v8-compile-cache";
import './index.css';
import { createApp } from 'vue';
import Index from './pages/index.vue';
import Countdown from './pages/countdown.vue';
import App from './App.vue';
import { createRouter, createWebHashHistory } from 'vue-router';

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
