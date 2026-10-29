import {afterEach, describe, expect, it, vi} from 'vitest'
import {createRenderer, nextTick, ssrContextKey} from 'vue'
import {createPinia} from 'pinia'
import StoresUpdater from '../../renderer/components/StoresUpdater.vue'
import {useSettingsStore} from '../../renderer/stores/settings.ts'
import {DEFAULT_STORE, DEFAULT_TIMER_SETTINGS, DEFAULT_WINDOW_SETTINGS} from '../../common/config.ts'

vi.mock('@vueuse/core', async importOriginal => {
  const original = await importOriginal<typeof import('@vueuse/core')>()
  const {ref} = await import('vue')
  return {...original, useWindowFocus: () => ref(false)}
})

type HostNode = {parent?: HostNode}
const renderer = createRenderer<HostNode, HostNode>({
  createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
  insert: (node, parent) => {node.parent = parent}, remove: () => {},
  setText: () => {}, setElementText: () => {}, patchProp: () => {},
  parentNode: node => node.parent, nextSibling: () => null,
})

afterEach(() => {vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals()})

describe('window bounds settings IPC', () => {
  it.each([false, true])('hides and shows a window with saved display metadata (fullscreen=%s)', async fullscreen => {
    vi.useFakeTimers()
    const settings = structuredClone(DEFAULT_STORE.defaults.settings)
    const display = {label: 'Test monitor', internal: false, bounds: {x: 0, y: 0, width: 1920, height: 1080}}
    settings.timers = {timer: {...structuredClone(DEFAULT_TIMER_SETTINGS), windows: {
      window: {...structuredClone(DEFAULT_WINDOW_SETTINGS), bounds: {
        ...structuredClone(DEFAULT_WINDOW_SETTINGS.bounds), hidden: false,
        fullscreenOn: fullscreen ? 1 : null, fullscreenDisplay: display,
      }},
    }}}
    const serialized: {key: string, value: unknown}[] = []
    const cloneErrors: unknown[] = []
    const api = {
      getSettings: vi.fn(async () => settings),
      setSettings: vi.fn(async (key: string, value: unknown) => {
        // Model Electron's structured-clone boundary rather than accepting proxies.
        try {serialized.push({key, value: structuredClone(value)})}
        catch (error) {cloneErrors.push(error)}
      }),
      windowUpdated: vi.fn(), settingsUpdated: vi.fn(), currentTimerSet: vi.fn(),
      onUpdate: vi.fn(), onWindowBoundsUpdated: vi.fn(), onWebserverUpdate: vi.fn(),
      onPlaybackUpdate: vi.fn(), onWebrtcUpdate: vi.fn(),
      isServerRunning: vi.fn(async () => ({isRunning: false, port: null, lastError: null})),
      webrtcStatus: vi.fn(async () => null), playbackStatus: vi.fn(async () => []),
      getNetworkAddresses: vi.fn(async () => []),
    }
    vi.stubGlobal('window', {api})
    const pinia = createPinia()
    // StoresUpdater has no UI; mount its actual setup/watchers without a DOM.
    const app = renderer.createApp({...StoresUpdater, render: (): null => null}).use(pinia)
    app.provide(ssrContextKey, {modules: new Set()})
    app.mount({})
    const store = useSettingsStore(pinia)
    try {
      for (let i = 0; i < 6; i++) {await Promise.resolve(); await nextTick()}
      for (const hidden of [true, false]) {
        store.settings.timers.timer.windows.window.bounds.hidden = hidden
        await nextTick()
        await vi.advanceTimersByTimeAsync(250)
        expect(cloneErrors).toEqual([])
        const boundsCalls = serialized.filter(call => call.key?.endsWith('.bounds'))
        expect(boundsCalls[boundsCalls.length - 1]).toEqual({
          key: 'timers.timer.windows.window.bounds',
          value: {...settings.timers.timer.windows.window.bounds, hidden, fullscreenDisplay: display},
        })
        expect(api.windowUpdated).toHaveBeenLastCalledWith('timer', 'window')
      }
    } finally {app.unmount()}
  })
})
