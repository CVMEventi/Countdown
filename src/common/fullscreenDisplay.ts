import type {WindowBounds} from './config.ts'

export type FullscreenDisplay = Pick<Electron.Display, 'id' | 'label' | 'internal' | 'bounds'>

function sameBounds(a: Electron.Rectangle, b: Electron.Rectangle) {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
}

export function resolveFullscreenDisplay(bounds: WindowBounds, displays: FullscreenDisplay[]): FullscreenDisplay | null {
  if (bounds.fullscreenOn === null) return null
  const available = displays.filter(display => display.id !== -1)
  const exact = available.find(display => display.id === bounds.fullscreenOn)
  if (exact) return exact

  const saved = bounds.fullscreenDisplay
  if (!saved) return null
  const candidates = available.filter(display => display.internal === saved.internal
    && (!saved.label || display.label === saved.label))
  // A unique monitor label also survives resolution and desktop-layout changes.
  if (saved.label && candidates.length === 1) return candidates[0]
  const positioned = candidates.filter(display => sameBounds(display.bounds, saved.bounds))
  return positioned.length === 1 ? positioned[0] : null
}

export function rememberFullscreenDisplay(bounds: WindowBounds, display: FullscreenDisplay): WindowBounds {
  return {...bounds, fullscreenOn: display.id, fullscreenDisplay: {
    label: display.label,
    internal: display.internal,
    bounds: {...display.bounds},
  }}
}
