<template>
  <div class="bg-white inline-flex border rounded justify-center" :class="classes">
    <input
      :value="formattedHours"
      @input="updateTime('hours', $event.target.value)"
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
      :value="formattedMinutes"
      @input="updateTime('minutes', $event.target.value)"
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
      :value="formattedSeconds"
      @input="updateTime('seconds', $event.target.value)"
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
  data() {
    return {
      seconds: 0,
      minutes: 0,
      hours: 0,
    }
  },
  watch: {
    modelValue: function(newVal, oldVal) {
      const duration = dayjs.duration(newVal, 'seconds')

      this.seconds = duration.seconds()
      this.minutes = duration.minutes()
      this.hours = duration.hours()
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
    formattedSeconds() {
      return this.padNumber(this.seconds)
    },
    formattedMinutes() {
      return this.padNumber(this.minutes)
    },
    formattedHours() {
      return this.padNumber(this.hours)
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
      let parsedValue = parseInt(value)

      if (parsedValue < 0) {
        parsedValue = 0
      }

      const oldDuration = dayjs.duration(this.modelValue, 'seconds')

      this.seconds = unit === 'seconds' ? parsedValue : oldDuration.seconds();
      this.minutes = unit === 'minutes' ? parsedValue : oldDuration.minutes();
      this.hours = unit === 'hours' ? parsedValue : oldDuration.hours();

      const duration = dayjs.duration({
        seconds: unit === 'seconds' ? parsedValue : oldDuration.seconds(),
        minutes: unit === 'minutes' ? parsedValue : oldDuration.minutes(),
        hours: unit === 'hours' ? parsedValue : oldDuration.hours()
      })

      console.log(duration.asHours());
      if (duration.asHours() >= 24) {
        let maxTime = 86399 // 23h 59m 59s as seconds

        this.$emit('update:modelValue', maxTime)
      } else {
        this.$emit('update:modelValue', duration.asSeconds())
      }
    }
  }
}
</script>

<style scoped>

</style>
