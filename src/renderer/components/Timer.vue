<template>
  <div />
</template>

<script>
import AdjustingInterval from "../AdjustingInterval";

export default {
  name: 'Timer',
  data () {
    return {
      adjustingTimer: null,
      secondsSet: 0,
      seconds: 0,
      stopsAtZero: false
    }
  },
  beforeMount() {
    this.adjustingTimer = new AdjustingInterval(this.timerTick, 1000);
  },
  computed: {
    isRunning () {
      return this.adjustingTimer.isRunning();
    }
  },
  methods: {
    start (seconds, stopsAtZero) {
      if (this.isRunning) {
        this.stop()
      }

      this.secondsSet = seconds
      this.seconds = seconds
      this.stopsAtZero = stopsAtZero

      this.$emit('timer-tick', this.seconds)

      this.resume()
    },
    resume () {
      if (this.isRunning) return
      this.adjustingTimer.start();
      this.$emit('timer-status-change', 'started')
    },
    stop () {
      if (this.isRunning) {
        this.adjustingTimer.stop();
        this.$emit('timer-status-change', 'stopped')
      }
    },
    toggle () {
      if (this.isRunning) {
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

      if (this.seconds <= 0 && this.stopsAtZero) {
        this.seconds = 0;
        this.$emit('timer-tick', 0)
        this.stop()
      }
    },
    add (seconds) {
      this.seconds += seconds;
      this.$emit('timer-tick', this.seconds)
    },
    sub (seconds) {
      this.seconds -= seconds;
      this.$emit('timer-tick', this.seconds)
    }
  }
}
</script>

<style scoped>

</style>
