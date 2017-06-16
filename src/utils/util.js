// util.js
'use strict';

const path = require('path');
const log = require('npmlog');

import { parseTocFile } from './tocreader';
import { mkTempDir, mkdirp, readDir, folderStat, copyFolder } from './fileutil';
import { gitRegex } from './parseplatform';

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
  const toc = await parseTocFile(getTocFileName(addonPath));
  const key = 'X-Curse-Project-ID'
  return toc[key];
}

export function getGitName(url) {
  let gitValid = gitRegex.exec(url);
  if (gitValid && gitValid[1]) {
    let tmp = gitValid[1].split('/');
    return tmp[tmp.length - 1];
  }
  return null;
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



