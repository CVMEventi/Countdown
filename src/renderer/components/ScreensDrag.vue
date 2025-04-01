<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :viewBox="svgSize"
    style="width: 100%;height: 100%;"
    ref="svg"
  >
    <g v-for="(window, key, index) in windows">
    <rect
      class="draggable"
      @mousedown="startDrag($event, key as string)"
      @mousemove="drag($event, key as string)"
      @mouseup="endDrag($event)"
      @mouseleave="endDrag"
      :x="windowCoordinates(key as string).x"
      :y="windowCoordinates(key as string).y"
      :width="windowCoordinates(key as string).width"
      :height="windowCoordinates(key as string).height"
      stroke="#ffffff" stroke-width="10" fill="black"></rect>
      <text
        :x="windowCoordinates(key as string).x + windowCoordinates(key as string).width / 2"
        :y="windowCoordinates(key as string).y + windowCoordinates(key as string).height / 2"
        :width="windowCoordinates(key as string).width"
        :height="windowCoordinates(key as string).height"
        dominant-baseline="middle" text-anchor="middle" fill="white" font-size="150">{{ index + 1 }}</text>
    </g>
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

<script lang="ts" setup>
import {computed, ref} from "vue";
import Display = Electron.Display;
import {WindowBounds, Windows, WindowSettings} from '../../common/config'

defineOptions({
  name: 'ScreensDrag',
});

let dragging = ref<string|null>(null);
let offset = ref<{
  x: number
  y: number
}>({
  x: 0,
  y: 0,
});
let svg = ref();

export interface Props {
  screens: Display[]
}

const props = defineProps<Props>()
const windows = defineModel<Windows>('windows')

const svgSize = computed(() => {
  let minX = 0;
  let minY = 0;
  let maxX = 0;
  let maxY = 0;

  let negativeOffsetX = 0;
  let negativeOffsetY = 0;

  props.screens.forEach((screen) => {
    negativeOffsetX = Math.min(negativeOffsetX, screen.bounds.x)
    negativeOffsetY = Math.min(negativeOffsetY, screen.bounds.y)
  });

  props.screens.forEach((screen) => {
    minX = Math.min(minX, screen.bounds.x)
    minY = Math.min(minY, screen.bounds.y)
    maxX = Math.max(maxX, Math.abs(negativeOffsetX) + screen.bounds.x + screen.bounds.width);
    maxY = Math.max(maxY, Math.abs(negativeOffsetY) + screen.bounds.y + screen.bounds.height)
  })

  return `${minX - 10} ${minY - 10} ${maxX + 20} ${maxY + 20}`
})

function startDrag(event: MouseEvent, key: string) {
  if (windows.value[key].bounds.fullscreenOn) {
    return;
  }
  dragging.value = key;
  offset.value = getMousePosition(event);
  offset.value.x -= parseFloat((event.target as HTMLElement).getAttributeNS(null, "x"));
  offset.value.y -= parseFloat((event.target as HTMLElement).getAttributeNS(null, "y"));
}

function drag(event: MouseEvent, key: string) {
  if (windows.value[key].bounds.fullscreenOn) {
    return;
  }
  if (dragging.value !== key) {
    return;
  }
  event.preventDefault();
  const mouseCoordinates = getMousePosition(event);

  let newWindow: WindowBounds = {
    alwaysOnTop: windows.value[key].bounds.alwaysOnTop,
    x: Math.round(mouseCoordinates.x - offset.value.x),
    y: Math.round(mouseCoordinates.y - offset.value.y),
    width: windows.value[key].bounds.width,
    height: windows.value[key].bounds.height,
    fullscreenOn: windows.value[key].bounds.fullscreenOn,
  }

  windows.value[key].bounds = newWindow;
}

function endDrag(event: MouseEvent) {
  dragging.value = null;
}

function getMousePosition(event: MouseEvent) {
  const CTM = (svg.value as SVGGraphicsElement).getScreenCTM();
  return {
    x: (event.clientX - CTM.e) / CTM.a,
    y: (event.clientY - CTM.f) / CTM.d
  };
}

function windowCoordinates(key: string) {
  let window = {...windows.value[key].bounds};
  if (window.fullscreenOn) {
    const screen = props.screens.find((screen) => screen.id == window.fullscreenOn)
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
