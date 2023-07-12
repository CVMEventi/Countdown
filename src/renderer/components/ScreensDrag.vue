<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :viewBox="svgSize"
    style="width: 100%;"
    ref="svg"
  >
    <rect
      v-for="(window, index) in windows"
      class="draggable"
      @mousedown="startDrag($event, index)"
      @mousemove="drag($event, index)"
      @mouseup="endDrag($event)"
      @mouseleave="endDrag"
      :x="windowCoordinates(index).x"
      :y="windowCoordinates(index).y"
      :width="windowCoordinates(index).width"
      :height="windowCoordinates(index).height"
      stroke="#ffffff" stroke-width="10" fill="black"></rect>
    <rect
      v-for="screen in screens"
      class="non-draggable"
      :x="screen.bounds.x"
      :y="screen.bounds.y"
      :height="screen.bounds.height"
      :width="screen.bounds.width"
      stroke="#ffffff"
      stroke-width="10"
      fill="none"></rect>
    <text
      v-for="(screen, index) in screens"
      :x="screen.bounds.x + 25"
      :y="screen.bounds.y + 100"
      font-family="Arial"
      font-size="100"
      fill="white"
    >
      {{ index + 1 }}
    </text>
  </svg>
</template>

<script lang="ts">
import {defineComponent} from "vue";

export default defineComponent({
  name: "ScreensDrag",
  data() {
    return {
      dragging: null,
      offset: {},
    }
  },
  props: {
    screens: Array,
    windows: {
      type: Array,
      default: [],
    },
  },
  computed: {
    svgSize() {
      let minX = 0;
      let minY = 0;
      let maxX = 0;
      let maxY = 0;

      let negativeOffsetX = 0;
      let negativeOffsetY = 0;

      this.screens.forEach((screen) => {
        negativeOffsetX = Math.min(negativeOffsetX, screen.bounds.x)
        negativeOffsetY = Math.min(negativeOffsetY, screen.bounds.y)
      });

      this.screens.forEach((screen) => {
        minX = Math.min(minX, screen.bounds.x)
        minY = Math.min(minY, screen.bounds.y)
        maxX = Math.max(maxX, Math.abs(negativeOffsetX) + screen.bounds.x + screen.bounds.width);
        maxY = Math.max(maxY, Math.abs(negativeOffsetY) + screen.bounds.y + screen.bounds.height)
      })

      return `${minX - 10} ${minY - 10} ${maxX + 20} ${maxY + 20}`
    }
  },
  methods: {
    startDrag(event, index) {
      if (this.windows[index].fullscreenOn) {
        return;
      }
      this.dragging = index;
      this.offset = this.getMousePosition(event);
      this.offset.x -= parseFloat(event.target.getAttributeNS(null, "x"));
      this.offset.y -= parseFloat(event.target.getAttributeNS(null, "y"));
    },
    drag(event, index) {
      if (this.windows[index].fullscreenOn) {
        return;
      }
      if (this.dragging !== index) {
        return;
      }
      event.preventDefault();
      const mouseCoordinates = this.getMousePosition(event);

      let newWindow = {
        x: Math.round(mouseCoordinates.x - this.offset.x),
        y: Math.round(mouseCoordinates.y - this.offset.y),
        width: this.windows[index].width,
        height: this.windows[index].height,
        fullscreenOn: this.windows[index].fullscreenOn,
      }

      let windows = this.windows;
      windows[index] = newWindow;
      this.$emit('update:windows', windows);
    },
    endDrag(event) {
      this.dragging = null;
    },
    getMousePosition(event) {
      const CTM = this.$refs.svg.getScreenCTM();
      return {
        x: (event.clientX - CTM.e) / CTM.a,
        y: (event.clientY - CTM.f) / CTM.d
      };
    },
    windowCoordinates(index) {
      let window = {...this.windows[index]};
      if (window.fullscreenOn) {
        const screen = this.screens.find((screen) => screen.id == window.fullscreenOn)
        if (!screen) {
          return window;
        }
        window.x = screen.bounds.x;
        window.y = screen.bounds.y;
        window.width = screen.bounds.width;
        window.height = screen.bounds.height;
      }

      return window;
    }
  }
});
</script>

<style scoped>
  .draggable {
    cursor: move;
  }

  text, .non-draggable {
    user-select: none;
    pointer-events: none;
  }
</style>
