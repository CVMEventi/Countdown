<template>
  <div class="inline-flex border rounded justify-center" :class="classes">
    <input
      v-model="hours"
      min="0"
      max="23"
      type="number"
      :disabled="disabled"
      class="input input-big input-number-fixed"
      :class="classes"
      @focus="$event.target.select()"
    >
    <p class="text-5xl">:</p>
    <input
      v-model="minutes"
      min="0"
      max="60"
      type="number"
      :disabled="disabled"
      class="input input-big input-number-fixed"
      :class="classes"
      @focus="$event.target.select()"
    >
    <p class="text-5xl">:</p>
    <input
      v-model="seconds"
      min="0"
      max="60"
      type="number"
      :disabled="disabled"
      class="input input-big input-number-fixed"
      :class="classes"
      @focus="$event.target.select()"
    >
  </div>
</template>

<script>
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
dayjs.extend(duration)

export default {
  name: 'TimeInput',
  props: {
    modelValue: {
      type: Number,
      default: 0,
    },
    disabled: {
      type: Boolean,
      default: false
    },
    color: {
      type: String,
      default: 'gray'
    }
  },
  computed: {
    classes () {
      return {
        'bg-gray-100': this.disabled && this.color === 'white',
        'bg-emerald-100': this.color === 'green',
        'bg-red-100': this.color === 'red',
        disabled: this.disabled
      }
    },
    seconds: {
      get() {
        const duration = dayjs.duration(this.modelValue, 'seconds')
        return this.padNumber(duration.seconds())
      },
      set(newValue) {
        this.updateTime('seconds', newValue)
      }
    },
    minutes: {
      get() {
        const duration = dayjs.duration(this.modelValue, 'seconds')
        return this.padNumber(duration.minutes())
      },
      set(newValue) {
        this.updateTime('minutes', newValue)
      }
    },
    hours: {
      get() {
        const duration = dayjs.duration(this.modelValue, 'seconds')
        return this.padNumber(duration.hours())
      },
      set(newValue) {
        this.updateTime('hours', newValue)
      }
    }
  },
  activated () {
    this.setTime(this.seconds)
  },
  methods: {
    padNumber (number) {
      return ('00' + number).slice(-2)
    },
    updateTime (unit, value) {
      const oldDuration = dayjs.duration(this.modelValue, 'seconds')

      const duration = dayjs.duration({
        seconds: unit === 'seconds' ? parseFloat(value) : oldDuration.seconds(),
        minutes: unit === 'minutes' ? parseFloat(value) : oldDuration.minutes(),
        hours: unit === 'hours' ? parseFloat(value) : oldDuration.hours()
      })

      this.$emit('update:modelValue', duration.asSeconds())
    }
  }
}
</script>

<style scoped>

</style>
