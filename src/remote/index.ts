import './index.css';
import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue';
import RemoteControl from './components/RemoteControl.vue';
import CountdownPage from './pages/CountdownPage.vue';
import { vNoWheel } from '../common/directives/noWheel.ts';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: RemoteControl },
    { path: '/countdown/:timerId/:windowId?', component: CountdownPage, props: true },
  ],
});

const app = createApp(App);
app.use(router);
app.directive('no-wheel', vNoWheel);
app.mount('#app');
