'use strict';
const downloader = require('./downloader');
const async = require('async');
const log = require('npmlog');
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
log.heading = 'wow';

const platforms = {
  'curse': require('./curse.js'),
  'tukui': require('./tukui'),
  'wowinterface': require('./wowinterface')
};


const Save = require('../lib/save.js');
const saveFileName = '.addons.json';

function Wow () {
  let Wow = function(wowpath) {
    this.wowpath = wowpath;
    this.saveFd = new Save(this.getSaveFile());
  }

  Wow.prototype = {
    getAddonsDir: function() {
      return path.join(this.wowpath, 'Interface', 'AddOns');
    },
    getSaveFile: function() {
      return path.join(this.wowpath, saveFileName);
    },
    getVersion: function() {
      return require('../package.json').version;
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
    install: function(platform, addonName, version, cb) {
      let self = this;
      let fetcher = platforms[platform];
      fetcher.getDownloadURL(addonName, version, (err, zipPath, v) => {
        if (err) {
          return cb(err);
        }
        self._install(zipPath, platform, addonName, v, cb);
      })
    },
  };

  return Wow;
}

module.exports = Wow();

let x = function(wowpath) {
  var wowdir = wowpath;
  var addonsdir = path.join(wowdir, 'Interface', 'AddOns');
  var cachedir = path.join(wowdir, 'Interface', 'ZipFiles');
  require('mkdirp').sync(cachedir);
  var savefile = path.join(wowdir, saveFileName);

  var wow = {};

  wow.version = require('../package.json').version;

  wow._install = function(url, source, addon, version, nocache, callback) {
    async.waterfall([
      downloader.obtainZipFile.bind(null, source, addon, url, nocache, cachedir),
      function(file, cb) {
        cb(null, file, addonsdir);
      },
      downloader.extractZip,
      function(folders, cb) {
        save._read(function(err, data) {
          if (err) cb(err);
          if (!data.addons) data.addons = {};
          data.addons[addon] = {
            source: source,
            version: version,
            folders: folders
          };
          save._update(data, function(err) {
            cb(err);
          });
        });
      }
    ], callback);
  };

  wow.install = function(source, addon, version, nocache, callback) {
    sources[source].getDownloadURL(addon, version, function(err, url, v, name) {
      if (err) return callback(err);
      if (name && name !== addon) {
        log.info('addon', 'addon name changed to %s', name);
      }
      wow._install(url, source, name || addon, v, nocache, callback);
    });
  };

  wow.update = function(addon, callback) {
    wow.checkupdate(addon, function(err, result, source, url, version){
      if (err) callback(err);
      if (!result) {
        callback(null, false);
      } else {
        wow._install(url, source, addon, version, false, function(err) {
          callback(err, true);
        });
      }
    });
  };

  wow.getDownloadURL = function(addon, source, version, callback) {
    if (!callback) {
      callback = version;
      version = null;
    }
    sources[source].getDownloadURL(addon, version, function(err, url, v, name) {
      callback(err, url, v, name);
    });
  };

  wow.checkupdate = function(addon, callback) {
    save._read(function(err, savefile) {
      if (err) callback(err);
      var source = savefile.addons[addon].source;
      sources[source].getDownloadURL(addon, null, function(err, url, version) {
        if (err) return callback(err);
        var oldversion = savefile.addons[addon].version;
        log.info('version', '%s:%s cur: %s, latest: %s%s', source, addon, oldversion, version, (version !== oldversion ? '!':''));
        if (oldversion !== version) {
          /**
           * We're assuming that a new version # means a new version
           * This is because some addon places (looking at you tukui.org)
           * don't have a standardized method of update numbers.
           */
          callback(null, true, source, url, version);
        } else {
          callback(null, false);
        }
      });
    });
  };

  wow.checkAllUpdates = function(concur, exclude, callback) {
    if (!callback) {
      //exclude is optional
      callback = exclude;
      exclude = [];
    }
    var updateable = [];
    var queue = async.queue(function(addon, cb) {
      //you could just pass wow.queue to this
      //but then you can't have a counter
      wow.checkupdate(addon, function(err, hasupdate) {
        if (hasupdate) updateable.push(addon);
        cb(err);
      });
    }, concur);
    save._read(function(err, savefile) {
      if (err) callback(err);
      Object.keys(savefile.addons).forEach(function(addon) {
        if (exclude.indexOf(addon) === -1) {
          //not excluded
          queue.push(addon);
        }
      });
      queue.drain = function(err) {
        if (err) callback(err);
        callback(null, updateable.length, updateable);
      };
    });
  };

  wow.uninstall = function(addon, callback) {
    save._read(function(err, data) {
      if (err) return callback(err);
      if (!data.addons[addon]) {
        return callback('notfound');
      }
      async.each(data.addons[addon].folders, function(foldername, cb) {
        var folder = path.join(addonsdir, foldername);
        var needed = false;
        Object.keys(data.addons).forEach(function(name) {
          if (!needed && data.addons[name].folders.indexOf(foldername) !== -1 && name !== addon) {
            log.fs('delete', 'folder %s needed by %s, not deleting', foldername, name);
            needed = true;
          }
        });
        if (!needed) {
          log.fs('delete', folder);
          rimraf(folder, cb);
        } else {
          cb(null);
        }
      }, function(err) {
        if (err) return callback(err);
        delete data.addons[addon];
        save._update(data, function(err) {
          callback(err);
        });
      });
    });
  };

  wow.blame = function(folder, callback) {
    save._read(function(err, data) {
      if (err) return callback(err);
      var addons = [];
      Object.keys(data.addons).forEach(function(addon) {
        if (data.addons[addon].folders.indexOf(folder) !== -1) {
          addons.push(data.addons[addon].source + ':' + addon);
        }
      });
      callback(null, addons);
    });
  };


  wow.sources = Object.keys.bind(Object, sources);

  return wow;
};