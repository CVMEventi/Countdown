<template>
  <div />
</template>

<script>
export default {
  name: 'Timer',
  data () {
    return {
      timerId: null,
      secondsSet: 0,
      seconds: 0,
      stopsAtZero: false
    }
  },
  computed: {
    isRunning () {
      return this.timerId !== null
    }
  },
  methods: {
    start (seconds, stopsAtZero) {
      if (this.timerId) {
        this.stop()
      }

      this.secondsSet = seconds
      this.seconds = seconds
      this.stopsAtZero = stopsAtZero

      this.$emit('timer-tick', this.seconds)

      this.resume()
    },
    resume () {
      this.timerId = setInterval(this.timerTick, 1000)
      this.$emit('timer-status-change', 'started')
    },
    stop () {
      if (this.timerId) {
        clearInterval(this.timerId)
        this.timerId = null
        this.$emit('timer-status-change', 'stopped')
      }
    },
    toggle () {
      if (this.timerId) {
        this.stop()
      } else {
        this.resume()
      }
    },
    reset () {
      this.stop()
      this.seconds = 0
      this.secondsSet = 0
      this.$emit('timer-status-change', 'reset')
      this.$emit('timer-tick', 0)
    },
    timerTick () {
      this.seconds = this.seconds - 1
      this.$emit('timer-tick', this.seconds)

      if (this.seconds === 0) {
        this.stop()
      }
    }
  }
}
</script>

<style scoped>

</style>
