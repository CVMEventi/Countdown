<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :viewBox="svgSize"
    style="width: 100%;height: 100%;touch-action: none;"
    ref="svg"
    @pointermove="onPointerMove"
    @pointerup="endInteraction"
    @pointercancel="endInteraction"
  >
    <g
      v-for="(window, key, index) in windows"
      :key="key"
      :class="{'hidden-window': window.bounds.hidden}"
      @pointerenter="emit('hover', key as string)"
      @pointerleave="emit('hover', null)"
    >
      <rect
        :class="window.bounds.fullscreenOn ? 'fullscreen' : 'draggable'"
        @pointerdown="startInteraction($event, key as string, 'move')"
        :x="windowCoordinates(key as string).x"
        :y="windowCoordinates(key as string).y"
        :width="windowCoordinates(key as string).width"
        :height="windowCoordinates(key as string).height"
        :stroke="key === highlightedWindow ? '#3b82f6' : '#ffffff'" stroke-width="10" fill="black"
        :stroke-dasharray="window.bounds.hidden ? '40 30' : undefined"></rect>
      <text
        :x="windowCoordinates(key as string).x + windowCoordinates(key as string).width / 2"
        :y="windowCoordinates(key as string).y + windowCoordinates(key as string).height / 2"
        :width="windowCoordinates(key as string).width"
        :height="windowCoordinates(key as string).height"
        dominant-baseline="middle" text-anchor="middle" fill="white" font-size="150">{{ index + 1 }}</text>
      <text
        v-if="window.bounds.hidden"
        :x="windowCoordinates(key as string).x + windowCoordinates(key as string).width / 2"
        :y="windowCoordinates(key as string).y + windowCoordinates(key as string).height / 2 + 130"
        dominant-baseline="middle" text-anchor="middle" fill="white" font-size="70">Hidden</text>
      <template v-if="!window.bounds.fullscreenOn">
        <rect
          v-for="handle in handleRects(key as string)"
          :key="handle.handle"
          :class="`handle handle-${handle.handle}`"
          @pointerdown="startInteraction($event, key as string, handle.handle)"
          :x="handle.x"
          :y="handle.y"
          :width="handle.width"
          :height="handle.height"
          :fill="handle.handle.length === 2 ? '#ffffff' : 'transparent'"
        ></rect>
      </template>
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
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from "vue";
import Display = Electron.Display;
import {WindowBounds, Windows} from '../../common/config'

defineOptions({
  name: 'ScreensDrag',
});

type Handle = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

const MIN_WIDTH = 160;
const MIN_HEIGHT = 90;
// Handle size in on-screen pixels, converted to SVG units using the current scale
const HANDLE_PX = 4;

const interaction = ref<{
  key: string
  handle: Handle
  pointerId: number
  start: { x: number, y: number }
  startBounds: Rect
} | null>(null);
const svg = ref<SVGSVGElement>();
const svgScale = ref(1);

export interface Props {
  screens: Display[]
  highlightedWindow?: string | null
  lockRatio?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  highlightedWindow: null,
  lockRatio: false,
})
const emit = defineEmits<{
  hover: [key: string | null]
}>()
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

const handleSize = computed(() => HANDLE_PX / svgScale.value);

function updateScale() {
  const CTM = svg.value?.getScreenCTM();
  if (CTM && CTM.a > 0) {
    svgScale.value = CTM.a;
  }
}

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  updateScale();
  resizeObserver = new ResizeObserver(updateScale);
  resizeObserver.observe(svg.value);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});

watch(svgSize, () => nextTick(updateScale));

function handleRects(key: string): (Rect & { handle: Handle })[] {
  const {x, y, width, height} = windowCoordinates(key);
  const h = handleSize.value;
  const c = h * 2;

  // Edges first, corners last so corners are on top
  return [
    {handle: 'n', x, y: y - h / 2, width, height: h},
    {handle: 's', x, y: y + height - h / 2, width, height: h},
    {handle: 'w', x: x - h / 2, y, width: h, height},
    {handle: 'e', x: x + width - h / 2, y, width: h, height},
    {handle: 'nw', x: x - c / 2, y: y - c / 2, width: c, height: c},
    {handle: 'ne', x: x + width - c / 2, y: y - c / 2, width: c, height: c},
    {handle: 'sw', x: x - c / 2, y: y + height - c / 2, width: c, height: c},
    {handle: 'se', x: x + width - c / 2, y: y + height - c / 2, width: c, height: c},
  ];
}

function startInteraction(event: PointerEvent, key: string, handle: Handle) {
  if (event.button !== 0 || windows.value[key].bounds.fullscreenOn) {
    return;
  }
  event.preventDefault();
  updateScale();

  const {x, y, width, height} = windows.value[key].bounds;
  interaction.value = {
    key,
    handle,
    pointerId: event.pointerId,
    start: getMousePosition(event),
    startBounds: {x, y, width, height},
  };
  svg.value.setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent) {
  const current = interaction.value;
  if (!current || current.pointerId !== event.pointerId) {
    return;
  }
  if (windows.value[current.key]?.bounds.fullscreenOn) {
    return;
  }
  event.preventDefault();

  const mouse = getMousePosition(event);
  const dx = mouse.x - current.start.x;
  const dy = mouse.y - current.start.y;

  const newRect = computeBounds(current.handle, current.startBounds, dx, dy, props.lockRatio !== event.shiftKey);

  const newWindow: WindowBounds = {
    ...windows.value[current.key].bounds,
    x: Math.round(newRect.x),
    y: Math.round(newRect.y),
    width: Math.round(newRect.width),
    height: Math.round(newRect.height),
  }

  windows.value[current.key].bounds = newWindow;
}

function computeBounds(handle: Handle, start: Rect, dx: number, dy: number, keepRatio: boolean): Rect {
  if (handle === 'move') {
    return {...start, x: start.x + dx, y: start.y + dy};
  }

  const right = start.x + start.width;
  const bottom = start.y + start.height;

  let width = start.width;
  let height = start.height;

  if (handle.includes('e')) width = start.width + dx;
  if (handle.includes('w')) width = start.width - dx;
  if (handle.includes('s')) height = start.height + dy;
  if (handle.includes('n')) height = start.height - dy;

  width = Math.max(MIN_WIDTH, width);
  height = Math.max(MIN_HEIGHT, height);

  const ratioKept = keepRatio && start.width > 0 && start.height > 0;

  if (ratioKept) {
    const ratio = start.width / start.height;
    if (handle.length === 2) {
      // Corners follow whichever axis the pointer pushed further
      if (width / ratio > height) {
        height = width / ratio;
      } else {
        width = height * ratio;
      }
    } else if (handle === 'e' || handle === 'w') {
      height = width / ratio;
    } else {
      width = height * ratio;
    }
    if (width < MIN_WIDTH) {
      width = MIN_WIDTH;
      height = width / ratio;
    }
    if (height < MIN_HEIGHT) {
      height = MIN_HEIGHT;
      width = height * ratio;
    }
  }

  // Keep the opposite edge fixed when dragging west/north edges
  let x = handle.includes('w') ? right - width : start.x;
  let y = handle.includes('n') ? bottom - height : start.y;

  // An edge drag with a locked ratio also changes the other axis: grow it around the center
  if (ratioKept && handle.length === 1) {
    if (handle === 'e' || handle === 'w') {
      y = start.y + (start.height - height) / 2;
    } else {
      x = start.x + (start.width - width) / 2;
    }
  }

  return {x, y, width, height};
}

function endInteraction(event: PointerEvent) {
  if (!interaction.value || interaction.value.pointerId !== event.pointerId) {
    return;
  }
  if (svg.value?.hasPointerCapture(event.pointerId)) {
    svg.value.releasePointerCapture(event.pointerId);
  }
  interaction.value = null;
}

function getMousePosition(event: MouseEvent) {
  const CTM = svg.value.getScreenCTM();
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

  .handle-n, .handle-s {
    cursor: ns-resize;
  }

  .handle-e, .handle-w {
    cursor: ew-resize;
  }

  .handle-nw, .handle-se {
    cursor: nwse-resize;
  }

  .handle-ne, .handle-sw {
    cursor: nesw-resize;
  }

  .hidden-window {
    opacity: 0.4;
  }

  text, .non-draggable {
    user-select: none;
    pointer-events: none;
  }
</style>
