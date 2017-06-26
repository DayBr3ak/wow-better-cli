const fs = require('fs');
let temp = require('temp');
// if (!global.DEBUG) {
  // temp = temp.track();
// }
const _mkdirp = require('mkdirp');
const ncp = require('ncp');
const _rimraf = require('rimraf');
ncp.limit = 16;

import { promisify } from './common';

export const writeFile = promisify(fs.writeFile);
export const readFile = promisify(fs.readFile);
export const readDir = promisify(fs.readdir);
export const folderStat = promisify(fs.stat);
export const mkTempDir = promisify(temp.mkdir);
export const tempOpen = promisify(temp.open);
export const closeFd = promisify(fs.close);
export const mkdirp = promisify(_mkdirp);
export const copyFolder = promisify(ncp);
export const rimraf = promisify(_rimraf);

const access = promisify(fs.access);
export function exists(filename) {
  return access(filename, fs.constants.R_OK | fs.constants.W_OK)
    .then(() => true)
    .catch(() => false)
}

