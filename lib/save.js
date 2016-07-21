'use strict';
const fs = require('fs');
const path = require('path');
const log = require('npmlog');
const mkdirp = require('mkdirp');

log.addLevel('save', 3000, { fg: 'grey' });


const userAppDataFolder = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + 'Library/Preferences' : process.env.HOME)
const appFolder = process.env.APPDATA ? "wowcli" : ".wowcli";


let Save = function() {
  let Save = function(pAppFolder) {
    this.folder = pAppFolder || path.join(userAppDataFolder, appFolder);
    this.path = path.join(this.folder, 'addons.config.json');
    this.cached = false;
    this.data = null;
  }

  Save.prototype._write = function(data, cb) {
    let self = this;
    mkdirp(self.folder, (err) => {
      if (err) {
        return cb(err);
      }
      fs.writeFile(self.path, data, cb);
    })
  };

  Save.prototype.write = function(data, cb) {
    let self = this;
    self.data = data
    self.cached = true;
    try {
      let jdata = JSON.stringify(data, null, '  ');
      self._write(jdata, (err) => {
        if (err) {
          self.data = null;
          self.cached = false;
          return cb(err);
        }
        log.save('write', self.path);
        cb(null);
      })
    } catch(err) {
      cb(err)
    }
  };

  Save.prototype.read = function(cb) {
    let self = this;
    if (self.cached && self.data) {
      return cb(null, self.data);
    }
    fs.readFile(self.path, function(err, data) {
      log.save('read', self.path);

      if (!err) {
        let d;
        try {
          d = JSON.parse(data);
        } catch (e) {
          return cb(e, null);
        }

        self.data = d;
        self.cached = true;
        cb(null, self.data);
      } else {
        log.save('read', `${self.path} file not found`);
        cb(null, null);
      }
    });
  };

  Save.prototype.update = function(addonName, addonData, cb) {
    let self = this;
    self.read((err, read_data) => {
      if (err) {
        return cb(err);
      }
      let _read_data = read_data;
      if (!_read_data) {
        _read_data = {
          addons: {}
        };
      }

      _read_data.addons[addonName] = addonData;
      self.write(_read_data, cb);
    })
  }

  Save.prototype.delete = function(addonName, cb) {
    let self = this;
    self.read((err, read_data) => {
      if (err) {
        return cb(err);
      }
      let _read_data = read_data;
      if (!_read_data || !_read_data.addons) {
        return cb('no file, nothing to delete')
      }
      delete _read_data.addons[addonName];
      self.write(_read_data, cb)
    })
  }

  return Save;
};

module.exports = Save();