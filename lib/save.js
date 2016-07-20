'use strict';
var fs = require('fs');
var log = require('npmlog');

log.addLevel('save', 3000, { fg: 'grey' });

let Save = function() {
  let Save = function(savefile) {
    this.savefile = savefile;
  }

  Save.prototype.write = function(data, cb) {
    log.save('write', this.savefile);
    let jdata = JSON.stringify(data, null, '  ');
    fs.writeFile(this.savefile, jdata, function(err) {
      cb(err);
    });
  };

  Save.prototype.read = function(cb) {
    log.save('read', this.savefile);
    fs.readFile(this.savefile, function(err, data) {
      if (!err) {
        cb(null, JSON.parse(data));
      } else {
        log.save('read', `${this.savefile} file not found`);
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

  return Save;
};

module.exports = Save();