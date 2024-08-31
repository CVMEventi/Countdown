import {CountdownSettings, DEFAULT_STORE} from "../../common/config.ts";
import Store from "electron-store";
import {applyMigrations} from "../Migrations/applyMigrations.ts";
import {getProperty, setProperty} from "dot-prop";


export class Config {
  store = new Store(DEFAULT_STORE)
  updatedConfig: () => void = null

  private _settings: CountdownSettings

  public get settings(): CountdownSettings {
      return this._settings
  }

  constructor(updatedConfig: () => void) {
    this.updatedConfig = updatedConfig
    const newConfig = applyMigrations(this.store.get(null, DEFAULT_STORE.defaults))
    this.store.set(newConfig)

    this._settings = this.store.get('settings')
  }

  set(key: string, value: unknown) {
    if (key) {
      setProperty(this._settings, key, value)
    } else {
      this._settings = value as CountdownSettings
    }
    this.store.set('settings', this._settings)
    if (this.updatedConfig) {
      this.updatedConfig()
    }
    return this._settings
  }

  get(key?: string): unknown {
    if (!key) return this._settings
    return getProperty(this._settings, key)
  }
}

