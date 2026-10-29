/* eslint-disable */
import { EventEmitter } from 'events'
import { BrowserWindow, app, shell } from 'electron'
import path from 'path'
import BrowserWindowConstructorOptions = Electron.BrowserWindowConstructorOptions;

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

const __dirname = import.meta.dirname;

// Show the window anyway if the renderer never reports it is ready (e.g. a page error),
// so the application cannot get stuck with an invisible window
const RENDERER_READY_TIMEOUT = 10000

export default class BrowserWinHandler {
  allowRecreate: boolean
  _eventEmitter: EventEmitter
  options: BrowserWindowConstructorOptions | (() => BrowserWindowConstructorOptions)
  browserWindow: BrowserWindow
  private _readyToShow = false
  private _rendererReady = false
  private _showRequested = false

  /**
   * @param [options] {object} - browser window options
   * @param [allowRecreate] {boolean}
   */
  constructor (options: BrowserWindowConstructorOptions | (() => BrowserWindowConstructorOptions), allowRecreate = true) {
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
    const options = typeof this.options === 'function' ? this.options() : this.options
    this._readyToShow = false
    this._rendererReady = false
    this._showRequested = options.show !== false
    this.browserWindow = new BrowserWindow({
      ...options,
      show: false,
      webPreferences: {
        ...options.webPreferences,
        preload: path.join(__dirname, 'preload.js'),
        backgroundThrottling: false, // countdown will not run when window is behind other windows
      },
    })
    this.browserWindow.once('ready-to-show', () => {
      this._readyToShow = true
      this._showIfReady()
    })
    const window = this.browserWindow
    const rendererReady = () => {
      clearTimeout(rendererReadyTimeout)
      if (this._rendererReady || this.browserWindow !== window) return
      this._rendererReady = true
      this._showIfReady()
    }
    const rendererReadyTimeout = setTimeout(() => {
      if (this._rendererReady || this.browserWindow !== window) return
      console.warn(`Window "${options.title ?? ''}" did not report ready in time; showing it anyway`)
      rendererReady()
    }, RENDERER_READY_TIMEOUT)
    const lifecycle = window as EventEmitter
    lifecycle.once('renderer-ready', rendererReady)
    window.once('closed', () => clearTimeout(rendererReadyTimeout))
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

  setVisibleWhenReady(visible: boolean) {
    this._showRequested = visible
    const window = this.browserWindow
    if (!window || window.isDestroyed()) return
    if (!visible) window.hide()
    else this._showIfReady()
  }

  private _showIfReady() {
    const window = this.browserWindow
    if (!this._readyToShow || !this._rendererReady || !window || window.isDestroyed()) return
    // The 'show' event reveals the content
    if (this._showRequested && !window.isVisible()) window.show()
    // Hidden windows still feed NDI/OMT through capturePage, so their content must be
    // revealed too. Some Linux window managers also map fullscreen windows before
    // emitting show, and their renderer still needs the signal once settings are ready.
    else window.webContents.send('window:visibility', true)
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
