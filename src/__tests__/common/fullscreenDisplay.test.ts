import {describe, expect, it} from 'vitest'
import {DEFAULT_WINDOW_BOUNDS, type WindowBounds} from '../../common/config.ts'
import {rememberFullscreenDisplay, resolveFullscreenDisplay, type FullscreenDisplay} from '../../common/fullscreenDisplay.ts'

const monitor = (id: number, label = 'Projector', x = 1920): FullscreenDisplay => ({
  id, label, internal: false, bounds: {x, y: 0, width: 1920, height: 1080},
})

describe('fullscreen display restoration', () => {
  it('keeps an existing display ID', () => {
    const display = monitor(10)
    expect(resolveFullscreenDisplay({...DEFAULT_WINDOW_BOUNDS, fullscreenOn: 10}, [display])).toBe(display)
  })

  it('restores the same monitor after its ID changes across a reboot', () => {
    const bounds = rememberFullscreenDisplay(DEFAULT_WINDOW_BOUNDS, monitor(10))
    const rebooted = monitor(20)
    expect(resolveFullscreenDisplay(bounds, [monitor(30, 'Main', 0), rebooted])).toBe(rebooted)
  })

  it('matches a uniquely named monitor after resolution and layout changes', () => {
    const bounds = rememberFullscreenDisplay(DEFAULT_WINDOW_BOUNDS, monitor(10))
    const changed = {...monitor(20, 'Projector', -2560), bounds: {x: -2560, y: 0, width: 2560, height: 1440}}
    expect(resolveFullscreenDisplay(bounds, [changed])).toBe(changed)
  })

  it('uses position to distinguish monitors with identical labels', () => {
    const bounds = rememberFullscreenDisplay(DEFAULT_WINDOW_BOUNDS, monitor(10))
    const selected = monitor(20)
    expect(resolveFullscreenDisplay(bounds, [monitor(30, 'Projector', 0), selected])).toBe(selected)
  })

  it('does not guess between indistinguishable monitors', () => {
    const bounds = rememberFullscreenDisplay(DEFAULT_WINDOW_BOUNDS, monitor(10))
    expect(resolveFullscreenDisplay(bounds, [monitor(20), monitor(30)])).toBeNull()
  })

  it('matches unnamed displays using their saved geometry', () => {
    const bounds = rememberFullscreenDisplay(DEFAULT_WINDOW_BOUNDS, monitor(10, ''))
    const rebooted = monitor(20, '')
    expect(resolveFullscreenDisplay(bounds, [monitor(30, '', 0), rebooted])).toBe(rebooted)
  })

  it('keeps a disconnected selection instead of choosing an unrelated monitor', () => {
    const bounds = rememberFullscreenDisplay(DEFAULT_WINDOW_BOUNDS, monitor(10))
    expect(resolveFullscreenDisplay(bounds, [monitor(30, 'Main', 0)])).toBeNull()
    expect(bounds.fullscreenOn).toBe(10)
  })

  it('can resolve a monitor once it appears after startup', () => {
    const bounds = rememberFullscreenDisplay(DEFAULT_WINDOW_BOUNDS, monitor(10))
    expect(resolveFullscreenDisplay(bounds, [])).toBeNull()
    const connected = monitor(20)
    expect(resolveFullscreenDisplay(bounds, [connected])).toBe(connected)
  })

  it('does not restore fullscreen when windowed mode was selected', () => {
    const bounds: WindowBounds = {...rememberFullscreenDisplay(DEFAULT_WINDOW_BOUNDS, monitor(10)), fullscreenOn: null}
    expect(resolveFullscreenDisplay(bounds, [monitor(10)])).toBeNull()
  })

  it('does not guess when legacy settings contain only a missing ID', () => {
    expect(resolveFullscreenDisplay({...DEFAULT_WINDOW_BOUNDS, fullscreenOn: 10}, [monitor(20)])).toBeNull()
  })

  it('ignores the invalid display ID reported during detection', () => {
    expect(resolveFullscreenDisplay({...DEFAULT_WINDOW_BOUNDS, fullscreenOn: -1}, [monitor(-1)])).toBeNull()
  })
})
