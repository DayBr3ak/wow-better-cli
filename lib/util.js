// util.js
'use strict';

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const temp = require('temp').track();
const tocreader = require('./tocreader.js');

exports.makeTmpWowFolder = (cb) => {
  temp.mkdir('wowfolder', function(err, wowFolder) {
    if (err) {
      return cb(err)
    }

    let interfaceDir = path.join(wowFolder, 'Interface')
    mkdirp(interfaceDir, (err) => {
      if (err) {
        return cb(err)
      }

      let addonsDir = path.join(interfaceDir, 'AddOns')
      mkdirp(addonsDir, (err) => {
        if (err) {
          return cb(err)
        }
        cb(null, wowFolder);
      })
    })
  })
};

exports.listAddonsInFolder = (folder, cb) => {
  // General function

  // Read the directory
  fs.readdir(folder, (err, list) => {
    // Return the error if something went wrong
    if (err)
      return cb(err);

    // For every file in the list
    list.forEach((file) => {
      // Full path of that file
      let _path = path.join(folder, file);
      // Get the file's stats
      fs.stat(_path, (err, stat) => {
        if (err) {
          return cb(err);
        }
        // If the file is a directory
        if (stat && stat.isDirectory())
          // Dive into the directory
          cb(null, _path);
      });
    });
  });
};

exports.getTocFileName = (pPath) => {
  let splited = pPath.split('\\'); // todo use plateform dependent split
  let addonFolderName = splited[splited.length - 1];
  let tocfilePath = path.join(pPath, addonFolderName + '.toc');
  return tocfilePath;
}

exports.listMyAddonsInFolder = (folder, cb) => {
  exports.listAddonsInFolder(folder, (err, addonFolder) => {
    if (err) {
      return cb(err);
    }
    const reBlizAddon = /Blizzard_/
    let isBlizAddon = reBlizAddon.exec(addonFolder) != null;
    if (!isBlizAddon) {
      cb(null, addonFolder);
    }
  })
}

exports.getUrlNameFromAddon = (addonPath, cb) => {
  let toc = tocreader.parse(exports.getTocFileName(addonPath));
  if (!toc) {
    return null;
  }
  let key = 'X-Curse-Project-ID'
  return toc[key];
}

exports.parseToc = (addonPath, cb) => {

}
