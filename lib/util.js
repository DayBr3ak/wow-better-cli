// util.js
'use strict';

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const temp = require('temp');
const async = require('async');
const log = require('npmlog');

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

exports.listFolderContent = (folder, cb) => {
  fs.readdir(folder, (err, list) => {
    if (err) {
      return cb(err);
    }

    list.forEach((entry) => {
      let _path = path.join(folder, entry);
      cb(null, _path);
    })
  })
}

exports.listAddonsInFolder = (folder, cb) => {
  exports.listFolderContent(folder, (err, entryPath) => {
    fs.stat(_path, (err, stat) => {
      if (err) {
        return cb(err);
      }
      // If the file is a directory
      if (stat && stat.isDirectory())
        cb(null, _path);
    });
  })
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


const tukuiRegex = /tukui:([0-9]+)$/;
const tukuiRegex2 = /(?:tukui:)?(elvui|tukui)$/;
const wowiRegex = /(?:(?:http:\/\/)?www\.)?wowinterface\.com\/downloads\/info([0-9]+)\-([A-Za-z0-9-_]+)(?:\.html)?$/;
const wowiRegex2 = /wowinterface:([A-Za-z0-9-_]+)\-([0-9]+)$/;
// const gitRegex = /.*\/([A-Za-z0-9-_])\.git$/
const gitRegex = /(?:\w+:\/\/)(?:.+@)*(?:[\w\d\.]+)(?::[\d]+){0,1}\/*(.*)\.git$/

const tukuiUI_git = {
  'tukui': 'http://git.tukui.org/Tukz/tukui.git',
  'elvui': 'http://git.tukui.org/Elv/elvui.git'
}

exports.parsePlatform = (addonName) => {
  let gitValid = gitRegex.exec(addonName);
  if (gitValid && gitValid[1]) {
    return  {
      platform: 'git',
      addon: addonName
    }
  }

  let tkValid2 = tukuiRegex2.exec(addonName);
  if (tkValid2 && tkValid2[1]) {
    return {
      platform: 'git',
      addon: tukuiUI_git[ tkValid2[1] ]
    }
  }

  let tukuiValidator = tukuiRegex.exec(addonName);
  if (tukuiValidator && tukuiValidator[1]) {
    return {
      platform: 'tukui',
      addon: 'tukui:' + tukuiValidator[1]
    }
  }

  let wowiValid2 = wowiRegex2.exec(addonName);
  // console.log(wowiValid2);
  if (wowiValid2 && wowiValid2[1] && wowiValid2[2]) {
    return {
      platform: 'wowinterface',
      addon: 'wowinterface:' + wowiValid2[1] + '-' + wowiValid2[2]
    }
  }

  let wowinterfaceValidator = wowiRegex.exec(addonName);
  //if result found && result is number
  if (wowinterfaceValidator && wowinterfaceValidator[1] && String(parseInt(wowinterfaceValidator[1])) === wowinterfaceValidator[1]) {
    let id = parseInt(wowinterfaceValidator[1]);
    let addon = wowinterfaceValidator[2];

    return {
      platform: 'wowinterface',
      addon: 'wowinterface:' + addon + '-' + id
    }
  }

  return {
    platform: 'curse',
    addon: addonName
  }
}

exports.getGitName = (url) => {
  let gitValid = gitRegex.exec(url);
  if (gitValid && gitValid[1]) {
    let tmp = gitValid[1].split('/');
    return tmp[tmp.length - 1];
  }
  return null;
}

exports.installAddonList = (wow, addonList, cb) => {
  let asyncQueue = [];
  addonList.forEach((addonParams) => {
    asyncQueue.push((_cb) => {
      let name, version;
      if (addonParams.name) {
        name = addonParams.name;
        version = addonParams.version;
      } else {
        name = addonParams;
        version = null;
      }
      log.info('installAddonList', `name: ${name}, version: ${version}`);
      wow.install(name, version, (err) => {
        _cb(err, name);
      })
    });
  })

  async.parallel(asyncQueue, (err, results) => {
    if (err) {
      return cb(err);
    }
    log.info('installAddonList', 'installed ' + results.join(', '))
    cb(null, results);
  })
}

const ncp = require('ncp')
ncp.limit = 16;

exports.copyFoldersTo = (folders, dest, cb) => {
  if (folders.length == 1) {
    return ncp(folders[0], dest, (err) => {
      cb(err)
    })
  }

  let asyncQueue = [];
  folders.forEach((folder) => {
    let newFolder = folder.split('\\'); // TODO unix
    newFolder = newFolder[newFolder.length - 1];
    let newDest = path.join(dest, newFolder);
    asyncQueue.push((_cb) => {
      log.info('copyFoldersTo', 'copying ' + folder + ' to ' + newDest);
      ncp(folder, newDest, (err) => {
        _cb(err);
      })
    })
  })

  async.parallel(asyncQueue, (err, results) => {
    if (err) {
      return cb(err);
    }
    log.info('copyFoldersTo', 'copied ' + results.join(', '))
    cb(null);
  })
}



















