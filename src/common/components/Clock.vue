<script setup lang="ts">
import {ClockIcon} from '@heroicons/vue/24/solid';
import dayjs from "dayjs";
import {computed, onMounted, onUnmounted, ref} from "vue";

export interface Props {
  isBig: boolean
  clockColor: string
  textColor: string
  secondsOnClock: boolean
  use12HourClock: boolean
}

const props = defineProps<Props>();

let currentTimeTimerId: ReturnType<typeof setInterval> | null = null;
const now = ref(Date.now());
const currentTime = computed(() => {
  const hours = props.use12HourClock ? 'hh' : 'HH';
  const seconds = props.secondsOnClock ? ':ss' : '';
  const period = props.use12HourClock ? ' a' : '';
  return dayjs(now.value).format(`${hours}:mm${seconds}${period}`);
});

onMounted(() => {
  if (currentTimeTimerId === null) {
    currentTimeTimerId = setInterval(() => { now.value = Date.now() }, 1000)
  }
})

onUnmounted(() => {
  clearInterval(currentTimeTimerId)
  currentTimeTimerId = null
})
</script>

<template>
  <div
    class="text-center text-clock font-digital-clock"
    :class="{
        'text-clock': !isBig,
        'text-clock-on-reset': isBig
      }"
  >
    <clock-icon
      class="inline-block"
      :class="{
          'clock-icon': !isBig,
          'clock-icon-on-reset': isBig
        }"
      :style="{color: clockColor}" />
    <span class="ml-5" :style="{color: textColor}">{{ currentTime }}</span>
  </div>
</template>

<style scoped>
.clock-icon {
  height: min(20vh, 15vw);
  width: min(20vh, 15vw);
}

.clock-icon-on-reset {
  height: min(40vh, 25vw);
  width: min(40vh, 25vw);
}

.text-clock {
  font-size: min(20vh, 15vw);
}

.text-clock-on-reset {
  font-size: min(40vh, 25vw);
}
</style>
