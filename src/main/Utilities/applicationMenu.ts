import {Menu} from 'electron'
import {SHOW_MAIN_WINDOW_SHORTCUT} from './globalShortcuts.ts'

export function applicationMenu(showMainWindow: () => void, shortcutEnabled = false) {
  return Menu.buildFromTemplate([
    {label: 'Show main window', accelerator: shortcutEnabled ? SHOW_MAIN_WINDOW_SHORTCUT : undefined, click: showMainWindow},
    {type: 'separator'},
    {label: 'Quit', role: 'quit', accelerator: 'CommandOrControl+Q'},
  ])
}
