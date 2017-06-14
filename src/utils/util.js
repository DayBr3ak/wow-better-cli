// util.js
'use strict';

const path = require('path');
const log = require('npmlog');

const tocReader = require('./tocreader.js');
import { mkTempDir, mkdirp, readDir, folderStat, copyFolder } from './fileutil';

export async function makeTmpWowFolder() {
  const wowFolder = await mkTempDir('wowfolder');
  const interfaceDir = path.join(wowFolder, 'Interface');
  await mkdirp(interfaceDir);
  const addonsDir = path.join(interfaceDir, 'AddOns');
  await mkdirp(addonsDir);
  return wowFolder
}

export async function listFolderContent(folder) {
  const list = await readDir(folder);
  return list.map((entry) => {
    return path.join(folder, entry);
  });
}

export async function listAddonsInFolder(folder) {
  const subFolders = await listFolderContent(folder);
  const result = [];
  for (let subFolder of subFolders) {
    const st = await folderStat(subFolder); // could do that differently, right now it's not parralel
    if (st && st.isDirectory()) {
      result.push(subFolder);
    }
  }
  return result;
}

export function getTocFileName(pPath) {
  let splited = pPath.split('\\'); // todo use plateform dependent split
  let addonFolderName = splited[splited.length - 1];
  let tocfilePath = path.join(pPath, addonFolderName + '.toc');
  return tocfilePath;
}

export async function listMyAddonsInFolder(folder) {
  const list = await listAddonsInFolder(folder);
  const reBlizAddonRegex = /Blizzard_/;

  return list.filter((addonFolder) => {
    reBlizAddonRegex.exec(addonFolder) === null;
  });
}

export async function getUrlNameFromAddon(addonPath, cb) {
  const toc = await tocReader.parse(getTocFileName(addonPath));
  const key = 'X-Curse-Project-ID'
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

export function parsePlatform(addonName) {
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

  const wowinterfaceValidator = wowiRegex.exec(addonName);
  //if result found && result is number
  if (wowinterfaceValidator && wowinterfaceValidator[1] && String(parseInt(wowinterfaceValidator[1])) === wowinterfaceValidator[1]) {
    const id = parseInt(wowinterfaceValidator[1]);
    const addon = wowinterfaceValidator[2];

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

export function getGitName(url) {
  let gitValid = gitRegex.exec(url);
  if (gitValid && gitValid[1]) {
    let tmp = gitValid[1].split('/');
    return tmp[tmp.length - 1];
  }
  return null;
}

export async function installAddonList(wow, addonList) {
  let awaits = [];
  for (let addonParams of addonList) {
    let name, version;
    if (addonParams.name) {
      name = addonParams.name;
      version = addonParams.version;
    } else {
      name = addonParams;
      version = null;
    }
    log.info('installAddonList', `name: ${name}, version: ${version}`);
    const promise = wow.install(name, version);
    awaits.push(promise);
  }
  await Promise.all(awaits);
}

export function installAddonListOld(wow, addonList) {
  let mainDefer = q.defer();

  let eventuallyInstall = (addonParams) => {
    let defer = q.defer();
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
      if (err) {
        log.error('err install', name);
        return defer.reject(err);
      }
      defer.resolve(name);
      mainDefer.notify(name);
    })

    return defer.promise;
  }

  q.all(addonList.map(eventuallyInstall))
    .then((results) => {
      mainDefer.resolve(results);
    }, (err) => {
      mainDefer.reject(err);
    })

  return mainDefer.promise;
}

export async function copyFoldersTo(folders, dest) {
  if (folders.length === 1) {
    await copyFolder(folders[0], dest);
    return;
  }

  const awaits = [];
  for (let folder of folders) {
    let newFolder = folder.split('\\'); // TODO unix
    newFolder = newFolder[newFolder.length - 1];
    let newDest = path.join(dest, newFolder);
    log.info('copyFoldersTo', 'copying ' + folder + ' to ' + newDest);
    awaits.push(copyFolder(folder, newDest));
  }
  await Promise.all(awaits);

}


export function copyFoldersToOld(folders, dest) {
  let mainDefer = q.defer();

  if (folders.length == 1) {
    ncp(folders[0], dest, (err) => {
      if (err)
        mainDefer.reject(err);
      else
        mainDefer.resolve()
    })
    return mainDefer.promise;
  }

  let eventuallyCopy = (folder) => {
    let defer = q.defer();
    let newFolder = folder.split('\\'); // TODO unix
    newFolder = newFolder[newFolder.length - 1];
    let newDest = path.join(dest, newFolder);
    log.info('copyFoldersTo', 'copying ' + folder + ' to ' + newDest);
    ncp(folder, newDest, (err) => {
      if (err) {
        return defer.reject(err);
      }
      mainDefer.notify();
      defer.resolve();
    })

    return defer.promise;
  }
  q.all(folders.map(eventuallyCopy))
    .then(() => {
      mainDefer.resolve();
    }, (err) => {
      mainDefer.reject(err);
    })

  return mainDefer.promise;
}



















