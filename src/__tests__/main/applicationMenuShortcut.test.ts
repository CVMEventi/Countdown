import {beforeEach, describe, expect, it, vi} from 'vitest'
import {Menu} from 'electron'
import setMenu from '../../main/Utilities/setMenu.js'

vi.mock('electron', () => ({app: {name: 'Countdown'}, globalShortcut: {}, shell: {},
  Menu: {buildFromTemplate: vi.fn(template => template), setApplicationMenu: vi.fn()},
}))
beforeEach(() => vi.clearAllMocks())

describe('Window menu Show main window shortcut', () => {
  it('removes the local binding on off/on/off transitions while preserving the menu action', () => {
    for (const enabled of [false, true, false]) {
      setMenu({browserWindow: {}}, {}, enabled)
      const template = vi.mocked(Menu.buildFromTemplate).mock.lastCall[0]
      const windowMenu = template.find(item => 'label' in item && item.label === 'Window')
      const item = (windowMenu.submenu as Electron.MenuItemConstructorOptions[])[0]
      expect(item.label).toBe('Show main window')
      expect(item.accelerator).toBe(enabled ? 'CommandOrControl+Shift+M' : undefined)
      expect(item.click).toBeTypeOf('function')
    }
    expect(Menu.setApplicationMenu).toHaveBeenCalledTimes(3)
  })
})
