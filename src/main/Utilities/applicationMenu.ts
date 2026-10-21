import {Menu} from 'electron'
import {SHOW_MAIN_WINDOW_SHORTCUT} from './globalShortcuts.ts'

export function applicationMenu(showMainWindow: () => void, label = 'Show main window') {
  return Menu.buildFromTemplate([
    {label, accelerator: SHOW_MAIN_WINDOW_SHORTCUT, click: showMainWindow},
    {type: 'separator'},
    {label: 'Quit', role: 'quit', accelerator: 'CommandOrControl+Q'},
  ])
}
