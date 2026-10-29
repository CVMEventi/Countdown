
import {defineStore} from 'pinia';
import {ref} from 'vue'
import {
  CountdownSettings,
  DEFAULT_CLOSE_ACTION,
  DEFAULT_REMOTE_SETTINGS,
  DEFAULT_SHOW_MAIN_WINDOW_SHORTCUT,
  DEFAULT_START_HIDDEN
} from '../../common/config.ts'


export const useSettingsStore = defineStore('settings', () => {
  let settings = ref<CountdownSettings>({
    presets: [],
    remote: DEFAULT_REMOTE_SETTINGS,
    setWindowAlwaysOnTop: false,
    closeAction: DEFAULT_CLOSE_ACTION,
    startHidden: DEFAULT_START_HIDDEN,
    showMainWindowShortcut: DEFAULT_SHOW_MAIN_WINDOW_SHORTCUT,
    timers: {},
  });

  return { settings };
});
