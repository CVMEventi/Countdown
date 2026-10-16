import {Menu} from 'electron'

export function applicationMenu(showMainWindow: () => void, label = 'Show main window') {
  return Menu.buildFromTemplate([
    {label, click: showMainWindow},
    {type: 'separator'},
    {label: 'Quit', role: 'quit'},
  ])
}
