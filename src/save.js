'use strict';
const path = require('path');
const log = require('npmlog');

import { readFile, writeFile, mkdirp } from './utils/fileutil';

log.addLevel('save', 3000, { fg: 'grey' });


const userAppDataFolder = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + 'Library/Preferences' : process.env.HOME)
const appFolder = process.env.APPDATA ? "wowcli" : ".wowcli";

export class Save {
  constructor(pAppFolder=null) {
    this.folder = pAppFolder || path.join(userAppDataFolder, appFolder);
    this.path = path.join(this.folder, 'addons.config.json');
    this.cached = false;
    this.data = null;
  }

  async _write(data) {
    await mkdirp(this.folder)
    await writeFile(this.path, data);
  }

  async write(data) {
    try {
      const jdata = JSON.stringify(data, null, '  ');
      await this._write(jdata);
      log.save('write', this.path);
      this.data = data;
      this.cached = true;
      return true;
    } catch (err) {
      this.data = null;
      this.cached = false;
      throw err;
    }
  }

  async read() {
    if (this.cached && this.data) {
      return this.data;
    }

    try  {
      const data = await readFile(this.path);
      log.save('read', this.path);
      this.data = JSON.parse(data);
      this.cached = true;
      return this.data;
    } catch(err) {
      log.save('read', `${this.path} file not found`);
      return {
        addons: {}
      };
    }
  }

  async update(addonName, addonData) {
    log.save('update');
    let readData = await this.read();
    readData.addons[addonName] = addonData;
    await this.write(readData);
  }

  async delete(addonName) {
    log.save('delete');
    let readData = await this.read();
    delete readData.addons[addonName];
    await this.write(readData);
  }

}
