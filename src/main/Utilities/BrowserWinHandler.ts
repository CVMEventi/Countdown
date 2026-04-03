/* eslint-disable */
import { EventEmitter } from 'events'
import { BrowserWindow, app, shell } from 'electron'
import path from 'path'
import BrowserWindowConstructorOptions = Electron.BrowserWindowConstructorOptions;
import { fileURLToPath } from 'url'

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

const __dirname = import.meta.dirname;

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
        preload: path.join(__dirname, 'preload.js'),
        backgroundThrottling: false, // countdown will not run when window is behind other windows
      },
    })
    this.browserWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url)
      return { action: 'deny' }
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

  /**
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
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      const urlSearchParams = new URLSearchParams(query);
      let queryString = urlSearchParams.toString();
      if (queryString !== "") queryString = "?" + queryString;
      await this.browserWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL + queryString + '#' + pagePath);
    } else {
      await this.browserWindow.loadFile(
        path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/src/renderer/index.html`),
        { query, hash: pagePath }
      );
    }
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
