'use strict';
const log = require('npmlog');
const path = require('path');
log.heading = 'wow';

import { parsePlatform } from './utils/util';
import { rimraf } from './utils/fileutil';
import { platforms, downloadZipToTempFile, extractZip } from './downloader';

log.addLevel('Wow', 3000, { fg: 'red' });
import { Save } from './save';
const saveFileName = '.addons.json';

export class Wow  {
  constructor(wowpath, appfolder) {
    this.wowpath = wowpath;
    this.saveFd = new Save(appfolder);
  }

  getAddonsDir() {
    return path.join(this.wowpath, 'Interface', 'AddOns');
  }

  getSaveFile() {
      return this.saveFd.path;
  }

  getVersion() {
    return require('../package.json').version; // FIXME
  }

  isPlatformValid(platform) {
    return platforms[platform] !== undefined;
  }

  platforms() {
    return Object.keys(platforms);
  }

  version() {
    return this.getVersion();
  }

  async getConfigData() {
    return await this.saveFd.read();
  }

  /**
  ** Install addon zip into wow folder
  ** @zipUrl, direct url to download zip file
  ** @platform, 'curse' or 'wowinterface' or ...
  ** @addonName, the addon to be installed
  ** @version, the version of the addon
  ** @cb, cb => return (error, addonFolders)
  **/
  async _install(zipUrl, platform, addonName, version) {
    log.Wow('_install')
    if (platform == 'git') {
      const gitData = await platforms.git.install(zipUrl, this.getAddonsDir());
      await this.saveFd.update(zipUrl, gitData);
      return;
    }
    const tempZip = await downloadZipToTempFile(zipUrl);
    const folders = await extractZip(tempZip, this.getAddonsDir());
    const addonData = {
      platform: platform,
      version: version,
      folders: folders
    };
    await this.saveFd.update(addonName, addonData);
  }

  /**
  ** Install addon NAME into wow folder
  ** @platform, 'curse' or 'wowinterface' or ...
  ** @addonName, the addon to be installed
  ** @version, the version of the addon
  ** @cb, cb => return (error, addonFolders)
  **/
  async install(pAddonName, pVersion) {
    log.Wow('install');
    let parsing = parsePlatform(pAddonName);
    let platform = parsing.platform;
    let addonName = parsing.addon;
    if (!this.isPlatformValid(platform)) {
      throw `platform ${platform} is not valid`;
    }
    const fetcher = platforms[platform];
    const [zipUrl, version] = await fetcher.getDownloadURL(addonName, pVersion);
    await this._install(zipUrl, platform, addonName, version);
  }

  async checkupdate(addonName) {
    log.Wow('checkupdate');
    const fileData = await this.saveFd.read();
    const platform = fileData.addons[addonName].platform;
    const version = fileData.addons[addonName].version;
    const fetcher = platforms[platform];
    let [zipUrl, newVersion] = await fetcher.getDownloadURL(addonName, null);
    log.info('version', '%s:%s cur: %s, latest: %s%s', platform, addonName, version, newVersion, (newVersion !== version ? '!':''));
    if (version !== newVersion) {
      /**
       * We're assuming that a new version # means a new version
       * This is because some addon places (looking at you tukui.org)
       * don't have a standardized method of update numbers.
       */
      return [true, platform, zipUrl, newVersion];
    }
    return [false];
  }

  async update(addonName) {
    log.Wow('update');
    const [isNew, platform, zipUrl, version] = await this.checkupdate(addonName);
    if (!isNew) {
      return false;
    }
    await this._install(zipUrl, platform, addonName, version);
    return true;
  }

  async uninstall(addonName) {
    log.Wow('uninstall');
    const data = await this.saveFd.read();
    if (!data.addons[addonName]) {
      throw 'addon ' + addonName + ' not found';
    }
    const awaits = []; // allow parrallel exec of promises
    for (let folderName of data.addons[addonName].folders) {
      const folder = path.join(this.getAddonsDir(), folderName);
      let needed = false;
      for (let name of Object.keys(data.addons)) {
        if (!needed && data.addons[name].folders.indexOf(folderName) !== -1 && name !== addonName) {
          needed = true;
          log.fs('delete', 'folder %s needed by %s, not deleting', folderName, name);
          break;
        }
      }
      if (!needed) {
        log.fs('delete', folder);
        awaits.push(rimraf(folder));
      }
    }

    await Promise.all(awaits);
    await this.saveFd.delete(addonName);
  }

  async blame(folder) {
    log.Wow('blame')
    const data = await this.saveFd.read();
    const addons = Object.keys(data.addons)
      .filter((addon) => {
        return data.addons[addon].folders.indexOf(folder) !== -1;
      })
      .map((addon) => {
        return data.addons[addon].platform + ':' + addon;
      });

    return addons;
  }

  async checkAllAddonsForUpdate(excludeList=[]) {
    log.Wow('checkAllAddonsForUpdate');
    const updates = [];
    const queue = [];
    const data = await this.saveFd.read();
    if (!data || !data.addons) {
      return [];
    }
    const addons = Object.keys(data.addons);
    const filteredAddons = addons.filter((addon) => {
      return excludeList.indexOf(addon) === -1;
    });
    for (let addon of filteredAddons) {
      let [hasupdate] = await this.checkupdate(addon);
      if (hasupdate) {
        updates.push(addon);
      }
    }
    log.info('allupdate', "updates: " + updates.length)
    return updates;
  }

}

