import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {BrowserWindow} from 'electron'
import {showMainWindow} from '../../main/Utilities/showMainWindow.ts'

beforeEach(() => {
  vi.stubGlobal('process', {...process, platform: 'win32', env: {...process.env}})
})

afterEach(() => vi.unstubAllGlobals())

describe('show main window', () => {
  it('restores a minimized control window before showing and focusing it', () => {
    const calls: string[] = []
    const window = {
      isDestroyed: () => false, isMinimized: () => true,
      restore: () => calls.push('restore'), show: () => calls.push('show'), focus: () => calls.push('focus'),
    }
    showMainWindow(window as unknown as BrowserWindow)
    expect(calls).toEqual(['restore', 'show', 'focus'])
  })

  it('shows a hidden control window without restoring an unrelated window state', () => {
    const window = {
      isDestroyed: () => false, isMinimized: () => false,
      restore: vi.fn(), show: vi.fn(), focus: vi.fn(),
    }
    showMainWindow(window as unknown as BrowserWindow)
    expect(window.restore).not.toHaveBeenCalled()
    expect(window.show).toHaveBeenCalledOnce()
    expect(window.focus).toHaveBeenCalledOnce()
  })

  it('ignores a control window that has already been destroyed', () => {
    const window = {isDestroyed: () => true, show: vi.fn()}
    showMainWindow(window as unknown as BrowserWindow)
    showMainWindow(null)
    expect(window.show).not.toHaveBeenCalled()
  })

  it('repeatedly activates a Wayland window after the timer covers it', () => {
    vi.stubGlobal('process', {...process, platform: 'linux', env: {XDG_SESSION_TYPE: 'wayland'}})
    let visible = false
    let focused = false
    // Model the compositor: mapping a hidden window activates it, while focus()
    // alone cannot raise an already mapped window behind a fullscreen timer.
    const window = {
      isDestroyed: () => false, isMinimized: () => false,
      isVisible: () => visible, isFocused: () => focused,
      hide: vi.fn(() => {visible = false}),
      show: () => {if (!visible) focused = true; visible = true},
      focus: vi.fn(),
    }
    for (let attempt = 0; attempt < 4; attempt++) {
      focused = false
      showMainWindow(window as unknown as BrowserWindow)
      expect(visible).toBe(true)
      expect(focused).toBe(true)
    }
    expect(window.hide).toHaveBeenCalledTimes(3)
  })

  it('leaves an already focused Wayland window mapped', () => {
    vi.stubGlobal('process', {...process, platform: 'linux', env: {WAYLAND_DISPLAY: 'wayland-0'}})
    const window = {
      isDestroyed: () => false, isMinimized: () => false,
      isVisible: () => true, isFocused: () => true,
      hide: vi.fn(), show: vi.fn(), focus: vi.fn(),
    }
    showMainWindow(window as unknown as BrowserWindow)
    expect(window.hide).not.toHaveBeenCalled()
    expect(window.focus).toHaveBeenCalledOnce()
  })

  it('restores a minimized Wayland window without hiding it again', () => {
    vi.stubGlobal('process', {...process, platform: 'linux', env: {XDG_SESSION_TYPE: 'wayland'}})
    const window = {
      isDestroyed: () => false, isMinimized: () => true,
      hide: vi.fn(), restore: vi.fn(), show: vi.fn(), focus: vi.fn(),
    }
    showMainWindow(window as unknown as BrowserWindow)
    expect(window.restore).toHaveBeenCalledOnce()
    expect(window.hide).not.toHaveBeenCalled()
  })

  it.each(['linux', 'win32', 'darwin'])('keeps ordinary activation on %s outside Wayland', platform => {
    vi.stubGlobal('process', {...process, platform, env: {XDG_SESSION_TYPE: 'x11'}})
    const window = {
      isDestroyed: () => false, isMinimized: () => false,
      isVisible: () => true, isFocused: () => false,
      hide: vi.fn(), show: vi.fn(), focus: vi.fn(),
    }
    showMainWindow(window as unknown as BrowserWindow)
    expect(window.hide).not.toHaveBeenCalled()
    expect(window.show).toHaveBeenCalledOnce()
    expect(window.focus).toHaveBeenCalledOnce()
  })
})
