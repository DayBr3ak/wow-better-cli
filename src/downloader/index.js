'use strict';
const log = require('npmlog');
const path = require('path');
const util = require('util');
const DecompressZip = require('decompress-zip');

import { request } from '../utils/request';
import { tempOpen, closeFd, writeFile, exists } from '../utils/fileutil';

log.addLevel('fs', 3000, { fg: 'cyan' }, 'file');
log.addLevel('zip', 3000, { fg: 'cyan' }, 'zip ');

import { Curse } from './curse';
import { Tukui } from './tukui';
import { Wowinterface } from './wowinterface';
import { GitAddon } from './git';

export const platforms = {
  'curse': new Curse(),
  'tukui': new Tukui(),
  'wowinterface': new Wowinterface(),
  'git': new GitAddon()
};

export async function downloadZipToTempFile(url) {
  const info = await tempOpen('wow');
  log.fs('temp', info.path);
  await closeFd(info.fd);
  log.http('GET', url);

  let [res, data] = await request({ url: url, encoding: null, progressbar: true });
  log.http(res.statusCode, url);
  await writeFile(info.path, data);
  log.fs('save', info.path);
  return info.path;
}

// not currently used
export async function obtainZipFile(source, addon, url, nocache, cachedir) {
  let zipfilename = util.format('%s_%s__%s', source, addon, url.substr(url.lastIndexOf('/')+1));
  zipfilename = path.join(cachedir, zipfilename);
  const fileExist = await exists(zipfilename);
  if (!nocache && exists) {
    log.fs('cached', zipfilename);
    return zipfilename;
  }
  log.http('GET', url);
  let [res, data] = await request({ url: url, encoding: null, progressbar: true });
  log.http(res.statusCode, url);
  await writeFile(zipfilename, data);
  log.fs('save', zipfilename);
  return zipfilename;
}

function unzip(zipfile, output) {
  return new Promise((resolve, reject) => {
    const unzipper = new DecompressZip(zipfile);
    let failed = false;
    unzipper.on('error', (err) => {
      reject(err);
      failed = true;
    });
    unzipper.on('extract', (log) => {
      if (!failed) {
        unzipper.list();
      }
    });
    unzipper.extract({
      path: output,
      filter: (file) => {
        return file.type !== "SymbolicLink";
      }
    });
    unzipper.on('list', (files) => {
      resolve(files);
    });
  });
}

export async function extractZip(zipfile, output) {
  const files = await unzip(zipfile, output);
  const folders = [];
  for (let file of files) {
    let folder = file.split(path.sep)[0];
    if (folders.indexOf(folder) === -1) {
      folders.push(folder);
    }
  }
  return folders;
}
