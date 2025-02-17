import {defineStore} from "pinia";
import {ref} from "vue";
import {TimerEngineUpdates} from "../../common/TimerInterfaces.ts";

export const useTimersStore = defineStore('timers', () => {
  const updates = ref<TimerEngineUpdates>({})

  return {updates}
})
