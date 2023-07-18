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

<script lang="ts" setup>
import {computed, ref} from "vue";
import Display = Electron.Display;
import {WindowBounds} from "../../common/config";

defineOptions({
  name: 'ScreensDrag',
});

let dragging = ref(null);
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
  windows: WindowBounds[]
}

const props = withDefaults(defineProps<Props>(), {
  windows: () => [],
});

const emit = defineEmits<{
  'update:windows': [windows: WindowBounds[]],
}>();

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

function startDrag(event: MouseEvent, index: number) {
  if (props.windows[index].fullscreenOn) {
    return;
  }
  dragging.value = index;
  offset.value = getMousePosition(event);
  offset.value.x -= parseFloat((event.target as HTMLElement).getAttributeNS(null, "x"));
  offset.value.y -= parseFloat((event.target as HTMLElement).getAttributeNS(null, "y"));
}

function drag(event: MouseEvent, index: number) {
  if (props.windows[index].fullscreenOn) {
    return;
  }
  if (dragging.value !== index) {
    return;
  }
  event.preventDefault();
  const mouseCoordinates = getMousePosition(event);

  let newWindow = {
    x: Math.round(mouseCoordinates.x - offset.value.x),
    y: Math.round(mouseCoordinates.y - offset.value.y),
    width: props.windows[index].width,
    height: props.windows[index].height,
    fullscreenOn: props.windows[index].fullscreenOn,
  }

  let windows = props.windows;
  windows[index] = newWindow;
  emit('update:windows', windows);
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

function windowCoordinates(index: number) {
  let window = {...props.windows[index]};
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
