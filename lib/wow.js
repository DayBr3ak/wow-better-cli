'use strict';
const downloader = require('./downloader');
const async = require('async');
const log = require('npmlog');
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
log.heading = 'wow';

const util = require('./util');

log.addLevel('Wow', 3000, { fg: 'red' });
const platforms = downloader.platforms;

const Save = require('../lib/save.js');
const saveFileName = '.addons.json';

function Wow () {
  let Wow = function(wowpath, appfolder) {
    this.wowpath = wowpath;
    this.saveFd = new Save(appfolder);
  }

  Wow.prototype = {
    getAddonsDir: function() {
      return path.join(this.wowpath, 'Interface', 'AddOns');
    },
    getSaveFile: function() {
      return this.saveFd.path;
    },
    getVersion: function() {
      return require('../package.json').version;
    },
    isPlatformValid: function(platform) {
      return platforms[platform] !== undefined;
    },
    platforms: function() {
      return Object.keys(platforms);
    },
    version: function() {
      let packageJson = require('../package.json');
      return packageJson.version;
    },

    getConfigData: function(cb) {
      let self = this;
      self.saveFd.read((err, data) => {
        if (err) {
          return cb(err);
        }
        cb(null, data);
      })
    },

    /**
    ** Install addon zip into wow folder
    ** @zipUrl, direct url to download zip file
    ** @platform, 'curse' or 'wowinterface' or ...
    ** @addonName, the addon to be installed
    ** @version, the version of the addon
    ** @cb, cb => return (error, addonFolders)
    **/
    _install: function(zipUrl, platform, addonName, version, cb) {
      log.Wow('_install')
      let self = this;
      downloader.downloadZipToTempFile(zipUrl, (err, tempZip) => {
        if (err) {
          return cb(err);
        }
        downloader.extractZip(tempZip, self.getAddonsDir(), (err, folders) => {
          if (err) {
            return cb(err);
          }

          let addonData = {
            platform: platform,
            version: version,
            folders: folders
          };
          // cb(null, folders);
          self.saveFd.update(addonName, addonData, (err) => {
            cb(err);
          })
        })
      })
    },
    /**
    ** Install addon NAME into wow folder
    ** @platform, 'curse' or 'wowinterface' or ...
    ** @addonName, the addon to be installed
    ** @version, the version of the addon
    ** @cb, cb => return (error, addonFolders)
    **/
    install: function(pAddonName, pVersion, cb) {
      log.Wow('install');
      let self = this;

      let parsing = util.parsePlatform(pAddonName);
      let platform = parsing.platform;
      let addonName = parsing.addon;
      let version = pVersion;

      if (!self.isPlatformValid(platform)) {
        return cb(`platform ${platform} is not valid`);
      }

      let fetcher = platforms[platform];
      fetcher.getDownloadURL(addonName, version, (err, zipUrl, v) => {
        if (err) {
          return cb(err);
        }
        self._install(zipUrl, platform, addonName, v, cb);
      })
    },

    checkupdate: function(addonName, cb) {
      log.Wow('checkupdate');
      let self = this;
      self.saveFd.read((err, fileData) => {
        if (err) {
          return cb(err);
        }
        let platform = fileData.addons[addonName].platform;
        let version = fileData.addons[addonName].version;
        let fetcher = platforms[platform];
        fetcher.getDownloadURL(addonName, null, (err, zipUrl, newVersion) => {
          if (err) {
            log.err('fetcher failed', err);
            return cb(err);
          }
          log.info('version', '%s:%s cur: %s, latest: %s%s', platform, addonName, version, newVersion, (newVersion !== version ? '!':''));
          if (version !== newVersion) {
            /**
             * We're assuming that a new version # means a new version
             * This is because some addon places (looking at you tukui.org)
             * don't have a standardized method of update numbers.
             */
            cb(null, true, platform, zipUrl, newVersion);
          } else {
            cb(null, false);
          }
        })
      });
    },

    update: function(addonName, cb) {
      log.Wow('update');
      let self = this;
      self.checkupdate(addonName, (err, isNew, platform, zipUrl, version) => {
        if (err) {
          return cb(err);
        }
        if (!isNew) {
          return cb(null, false);
        }
        self._install(zipUrl, platform, addonName, version, (err) => {
          cb(err, true);
        })
      })
    },

    uninstall: function(addonName, cb) {
      log.Wow('uninstall')
      let self = this;
      self.saveFd.read((err, data) => {
        if (err) {
          return cb(err);
        }
        if (!data.addons[addonName]) {
          return cb('not found');
        }

        let deleteCallback = (err) => {
          if (err)
            return cb(err);
          self.saveFd.delete(addonName, cb)
        }

        data.addons[addonName].folders.forEach((folderName) => {
          let folder = path.join(self.getAddonsDir(), folderName);
          let needed = false;
          Object.keys(data.addons).forEach(function(name) {
            if (!needed && data.addons[name].folders.indexOf(folderName) !== -1 && name !== addonName) {
              log.fs('delete', 'folder %s needed by %s, not deleting', folderName, name);
              needed = true;
            }
          });

          if (!needed) {
            log.fs('delete', folder);
            rimraf(folder, deleteCallback);
          } else {
            deleteCallback(null);
          }
        })
      })
    },

    blame: function(folder, cb) {
      log.Wow('blame')
      let self = this;
      self.saveFd.read((err, data) => {
        if (err) {
          return cb(err);
        }
        let addons = [];
        Object.keys(data.addons).forEach(function(addon) {
          if (data.addons[addon].folders.indexOf(folder) !== -1) {
            addons.push(data.addons[addon].platform + ':' + addon);
          }
        });
        cb(null, addons);
      })
    },

    checkAllAddonsForUpdate: function(_exclude, _cb) {
      log.Wow('checkAllAddonsForUpdate');
      let self = this;
      let cb = _cb;
      let exclude = _exclude;
      if (!_cb) {
        cb = _exclude;
        exclude = [];
      }

      let updates = [];
      let queue = [];
      self.saveFd.read((err, data) => {
        if (err) {
          return cb(err);
        }

        if (!data || !data.addons) {
          return cb(null, []);
        }

        let addons = Object.keys(data.addons);
        let filteredAddons = []
        let cntChecked = 0;

        addons.forEach((addon) => {
          if (exclude.indexOf(addon) === -1) {
            filteredAddons.push(addon)
          }
        });

        filteredAddons.forEach((addon) => {
          //not excluded
          self.checkupdate(addon, (err, hasupdate) => {
            if (hasupdate) {
              updates.push(addon);
            }
            cntChecked += 1
            if (cntChecked >= filteredAddons.length) {
              log.info('allupdate', "updates: " + updates.length)
              cb(null, updates);
            }
          });
        });
      });
    },

  };
  return Wow;
}

module.exports = Wow();
