<template>
  <div class="inline-flex border rounded justify-center" :class="classes">
    <input
      :value="formattedHours"
      @input="updateTime('hours', $event.target.value)"
      min="0"
      max="23"
      type="number"
      :disabled="disabled"
      class="input input-big input-number-fixed"
      :class="classes"
      @click="$event.target.select()"
      @focus="$event.target.select()"
    >
    <p class="text-5xl">:</p>
    <input
      :value="formattedMinutes"
      @input="updateTime('minutes', $event.target.value)"
      min="0"
      max="60"
      type="number"
      :disabled="disabled"
      class="input input-big input-number-fixed"
      :class="classes"
      @click="$event.target.select()"
      @focus="$event.target.select()"
    >
    <p class="text-5xl">:</p>
    <input
      :value="formattedSeconds"
      @input="updateTime('seconds', $event.target.value)"
      min="0"
      max="60"
      type="number"
      :disabled="disabled"
      class="input input-big input-number-fixed"
      :class="classes"
      @click="$event.target.select()"
      @focus="$event.target.select()"
    >
  </div>
</template>

<script lang="ts" setup>
import {computed, onMounted, ref, watch} from "vue"
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
dayjs.extend(duration)

// Inits

defineOptions({
  name: 'TimeInput',
})

export interface Props {
  modelValue: number
  type?: number
  disabled?: boolean
  color: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 0,
  disabled: false,
  color: '',
})

const emit = defineEmits(['update:modelValue'])

onMounted(() => {
  updatedValue(props.modelValue)
})

let seconds = ref(0)
let minutes = ref(0)
let hours = ref(0)

watch(() => props.modelValue, (newVal) => {
  updatedValue(newVal)
})

// Methods

function updatedValue(newVal: number) {
  const duration = dayjs.duration(newVal, 'seconds')

  seconds.value = duration.seconds()
  minutes.value = duration.minutes()
  hours.value = duration.hours()
}

function padNumber (number: number) {
  return ('00' + number).slice(-2)
}
function updateTime(unit: string, value: string) {
  let parsedValue = parseInt(value)

  if (parsedValue < 0) {
    parsedValue = 0
  }

  const oldDuration = dayjs.duration(props.modelValue, 'seconds')

  seconds.value = unit === 'seconds' ? parsedValue : oldDuration.seconds()
  minutes.value = unit === 'minutes' ? parsedValue : oldDuration.minutes()
  hours.value = unit === 'hours' ? parsedValue : oldDuration.hours()

  const duration = dayjs.duration({
    seconds: unit === 'seconds' ? parsedValue : oldDuration.seconds(),
    minutes: unit === 'minutes' ? parsedValue : oldDuration.minutes(),
    hours: unit === 'hours' ? parsedValue : oldDuration.hours()
  })

  if (duration.asHours() >= 24) {
    let maxTime = 86399 // 23h 59m 59s as seconds

    emit('update:modelValue', maxTime)
  } else {
    emit('update:modelValue', duration.asSeconds())
  }
}

// Computed properties

const classes = computed(() => {
  return {
    'bg-white': !props.disabled && props.color === 'white',
    'bg-gray-100': props.disabled && props.color === 'white',
    'bg-emerald-100': props.color === 'green',
    'bg-red-100': props.color === 'red',
    disabled: props.disabled
  }
})
const formattedSeconds = computed(() => padNumber(seconds.value))
const formattedMinutes = computed(() => padNumber(minutes.value))
const formattedHours = computed(() => padNumber(hours.value))
</script>

<style scoped>

</style>
