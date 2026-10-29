import {EventEmitter} from 'node:events'
import {afterEach, describe, expect, it, vi} from 'vitest'
import type {BrowserWindow} from 'electron'
import {setFullScreen} from '../../main/Utilities/setFullScreen.ts'

afterEach(() => vi.unstubAllGlobals())

function makeWindow(fullscreen = false) {
  return Object.assign(new EventEmitter(), {
    isDestroyed: () => false,
    isFullScreen: () => fullscreen,
    setFullScreen: vi.fn(),
  })
}

describe('native fullscreen transitions', () => {
  it('switches immediately on Windows without a timer', async () => {
    vi.stubGlobal('process', {...process, platform: 'win32'})
    const window = makeWindow()
    await setFullScreen(window as unknown as BrowserWindow, true)
    expect(window.setFullScreen).toHaveBeenCalledWith(true)
    expect(window.eventNames()).toHaveLength(0)
  })

  it('waits for the native macOS fullscreen event', async () => {
    vi.stubGlobal('process', {...process, platform: 'darwin'})
    const window = makeWindow()
    let completed = false
    const pending = setFullScreen(window as unknown as BrowserWindow, true).then(() => {completed = true})
    await Promise.resolve()
    expect(completed).toBe(false)
    window.emit('enter-full-screen')
    await pending
    expect(completed).toBe(true)
    expect(window.eventNames()).toHaveLength(0)
  })

  it('stops waiting if the window closes during a macOS transition', async () => {
    vi.stubGlobal('process', {...process, platform: 'darwin'})
    const window = makeWindow(true)
    const pending = setFullScreen(window as unknown as BrowserWindow, false)
    window.emit('closed')
    await pending
    expect(window.eventNames()).toHaveLength(0)
  })
})
