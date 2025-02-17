/* eslint-disable */
import { EventEmitter } from 'events'
import { BrowserWindow, app } from 'electron'
import BrowserWindowConstructorOptions = Electron.BrowserWindowConstructorOptions;
const DEV_SERVER_URL = process.env.DEV_SERVER_URL
const isProduction = process.env.NODE_ENV === 'production'
const isDev = process.env.NODE_ENV === 'development'

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;

export default class BrowserWinHandler {
  allowRecreate: boolean
  _eventEmitter: EventEmitter
  options: BrowserWindowConstructorOptions
  browserWindow: BrowserWindow

  /**
   * @param [options] {object} - browser window options
   * @param [allowRecreate] {boolean}
   */
  constructor (options: BrowserWindowConstructorOptions, allowRecreate = true) {
    this._eventEmitter = new EventEmitter()
    this.allowRecreate = allowRecreate
    this.options = options
    this.browserWindow = null
    this._createInstance()
  }

  _createInstance () {
    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    if (app.isReady()) this._create()
    else {
      app.once('ready', () => {
        this._create()
      })
    }
  }

  _create () {
    this.browserWindow = new BrowserWindow({
      ...this.options,
      webPreferences: {
        ...this.options.webPreferences,
        nodeIntegration: true, // allow loading modules via the require () function
        contextIsolation: false, // https://github.com/electron/electron/issues/18037#issuecomment-806320028
        backgroundThrottling: false, // countdown will not run when window is beh
      },
    })
    this.browserWindow.on('closed', () => {
      // Dereference the window object
      this.browserWindow = null
    })
    this._eventEmitter.emit('created')
  }

  _recreate () {
    if (this.browserWindow === null) this._create()
  }

  /**
   * @callback onReadyCallback
   * @param {BrowserWindow}
   */

  /**x
   *
   * @param callback {onReadyCallback}
   */
  onCreated (callback: (browserWindow: BrowserWindow) => void) {
    if (this.browserWindow !== null) return callback(this.browserWindow);
    this._eventEmitter.once('created', () => {
      callback(this.browserWindow)
    })
  }

  async loadPage(pagePath: string, query?: Record<string, string>) {
    if (!this.browserWindow) return Promise.reject(new Error('The page could not be loaded before win \'created\' event'))
    const serverUrl = MAIN_WINDOW_WEBPACK_ENTRY;
    const urlSearchParams = new URLSearchParams(query);
    let queryString = urlSearchParams.toString()
    if (queryString !== "") {
      queryString = "?" + queryString
    }
    console.log(queryString)
    const fullPath = serverUrl + queryString + '#' + pagePath;
    await this.browserWindow.loadURL(fullPath)
  }

  /**
   *
   * @returns {Promise<BrowserWindow>}
   */
  created () {
    return new Promise(resolve => {
      this.onCreated(() => resolve(this.browserWindow))
    })
  }
}
