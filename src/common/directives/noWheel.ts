import type { Directive } from 'vue'

function onWheel(event: WheelEvent) {
  const target = event.currentTarget as HTMLElement
  if (document.activeElement !== target) return

  // A focused number input changes its value on wheel, which can silently alter a live
  // timer. Swallow this event and drop focus, so further scrolling moves the page instead.
  event.preventDefault()
  target.blur()
}

export const vNoWheel: Directive<HTMLElement> = {
  mounted(el) {
    el.addEventListener('wheel', onWheel, { passive: false })
  },
  unmounted(el) {
    el.removeEventListener('wheel', onWheel)
  },
}
