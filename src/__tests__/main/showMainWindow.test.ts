import {describe, expect, it, vi} from 'vitest'
import type {BrowserWindow} from 'electron'
import {showMainWindow} from '../../main/Utilities/showMainWindow.ts'

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
})
