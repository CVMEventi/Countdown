<template>
  <Card class="inline-block border flex flex-col">
    <p class="text-lg uppercase">Timer</p>
    <CheckBox id="showHours" v-model="window.show.hours">Show hours</CheckBox>
    <CheckBox id="pulseAtZero" v-model="window.pulseAtZero">Pulse at zero</CheckBox>
    <CheckBox id="timerAlwaysOnTop" v-model="window.bounds.alwaysOnTop">Window always on top</CheckBox>

    <p class="text-sm mt-2">Content at Reset</p>
    <select v-model="window.contentAtReset" class="input p-2">
      <option :value="ContentAtReset.Empty">Empty</option>
      <option :value="ContentAtReset.Time">Time</option>
      <option :value="ContentAtReset.Full">Full</option>
    </select>
  </Card>
</template>

<script lang="ts" setup>
import { ContentAtReset, WindowSettings } from '../../common/config.ts'
import Card from '@common/components/Card.vue'
import CheckBox from '@common/components/CheckBox.vue'

const window = defineModel<WindowSettings>({ required: true })
</script>
