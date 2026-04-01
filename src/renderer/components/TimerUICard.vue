<template>
  <Card class="inline-block border flex flex-col">
    <p class="text-lg uppercase">Timer UI</p>
    <CheckBox id="showTimer" v-model="window.show.timer">Timer</CheckBox>
    <CheckBox id="showProgress" v-model="window.show.progress">Progress</CheckBox>
    <CheckBox id="showClock" v-model="window.show.clock">Clock</CheckBox>
    <CheckBox id="showSecondsOnClock" v-model="window.show.secondsOnClock">Seconds on clock</CheckBox>
    <CheckBox id="messageBoxFixedHeight" v-model="window.messageBoxFixedHeight">Message box fixed height</CheckBox>
    <CheckBox id="use12HourClock" v-model="window.use12HourClock">12-Hour Clock</CheckBox>
    <CheckBox id="minusSignOnExtra" v-model="window.show.minusSignOnExtra">Minus Sign on Extra</CheckBox>
  </Card>
</template>

<script lang="ts" setup>
import { WindowSettings } from '../../common/config.ts'
import Card from '@common/components/Card.vue'
import CheckBox from '@common/components/CheckBox.vue'

const window = defineModel<WindowSettings>({ required: true })
</script>
