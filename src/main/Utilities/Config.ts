import {CountdownSettings, CountdownStore, DEFAULT_STORE} from "../../common/config";
import Store from "electron-store";
import {applyMigrations} from "../Migrations/applyMigrations";
import {getProperty, setProperty} from "dot-prop";


export class Config {
  store = new Store(DEFAULT_STORE)
  updatedConfig: () => void = null

  private _settings: CountdownSettings

  public get settings(): CountdownSettings {
      return this._settings
  }

  constructor(updatedConfig: () => void) {
    const newConfig = applyMigrations(this.store.get(null));
    this.store.set(newConfig);

    this._settings = this.store.get('settings')
  }

  set(key: string, value: any) {
    if (key) {
      setProperty(this._settings, key, value)
    } else {
      this._settings = value
    }
    this.store.set('settings', this._settings)
    if (this.updatedConfig) {
      this.updatedConfig()
    }
    return this._settings
  }

  get(key?: string): any {
    if (!key) return this._settings
    return getProperty(this._settings, key)
  }
}

