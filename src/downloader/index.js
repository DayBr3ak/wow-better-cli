'use strict';
const _request = require('request');
const log = require('npmlog');
const path = require('path');
const util = require('util');
const DecompressZip = require('decompress-zip');

import { tempOpen, closeFd, writeFile, exists } from '../utils/fileutil';

log.addLevel('fs', 3000, { fg: 'cyan' }, 'file');
log.addLevel('zip', 3000, { fg: 'cyan' }, 'zip ');

export const platforms = {
  'curse': require('./curse'),
  'tukui': require('./tukui'),
  'wowinterface': require('./wowinterface'),
  'git': require('./git'),
};

function request(opts) {
  return new Promise((resolve, reject) => {
    _request(opts, (err, res, data) => {
      if (err) {
        return reject(err);
      }
      resolve([res, data]);
    });
  });
}

export async function downloadZipToTempFile(url) {
  const info = await tempOpen('wow');
  log.fs('temp', info.path);
  await closeFd(info.fd);
  log.http('GET', url);
  let [res, data] = await request({ url: url, encoding: null });
  log.http(res.statusCode, url);
  await writeFile(info.path, data);
  log.fs('save', info.path);
  return info.path;
}

// export function downloadZipToTempFileOld(url, cb) {
//   temp.open('wow', function(err, info) {
//     if (err) {
//       return cb(err);
//     }
//     log.fs('temp', info.path);
//     fs.closeSync(info.fd);
//     log.http('GET', url);
//     request({
//       url: url,
//       encoding: null
//     }, function(err, res, data) {
//       log.http(res.statusCode, url);
//       if (err)  {
//         return cb(err);
//       }
//       fs.writeFile(info.path, data, function(err) {
//         log.fs('save', info.path);
//         if (err) {
//           return cb(err);
//         }
//         return cb(null, info.path);
//       });
//     });
//   });
// };

export async function obtainZipFile(source, addon, url, nocache, cachedir) {
  let zipfilename = util.format('%s_%s__%s', source, addon, url.substr(url.lastIndexOf('/')+1));
  zipfilename = path.join(cachedir, zipfilename);
  const fileExist = await exists(zipfilename);
  if (!nocache && exists) {
    log.fs('cached', zipfilename);
    return zipfilename;
  }
  log.http('GET', url);
  let [res, data] = await request({ url: url, encoding: null });
  log.http(res.statusCode, url);
  await writeFile(zipfilename, data);
  log.fs('save', zipfilename);
  return zipfilename;
}

// export function obtainZipFileOld(source, addon, url, nocache, cachedir, callback) {
//   var zipfilename = util.format('%s_%s__%s', source, addon, url.substr(url.lastIndexOf('/')+1));
//   zipfilename = path.join(cachedir, zipfilename);
//   if (!nocache && fs.existsSync(zipfilename)) {
//       log.fs('cached', zipfilename);
//       callback(null, zipfilename);
//   } else {
//     log.http('GET', url);
//     request({
//       url: url,
//       encoding: null
//     }, function(err, res, data) {
//       log.http(res.statusCode, url);
//       if (err) return callback(err);
//       fs.writeFile(zipfilename, data, function(err) {
//         log.fs('save', zipfilename);
//         callback(err, zipfilename);
//       });
//     });
//   }

// };

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
  return files.filter((file) => {
    let folder = file.split(path.sep)[0];
    return folders.indexOf(folder) === -1;
  });
}

// export function extractZipOld(zipfile, output, cb) {
//   let unzipper = new DecompressZip(zipfile);
//   log.zip('file', zipfile);
//   let failed = false;

//   unzipper.on('error', function (err) {
//     failed = true;
//     cb(err);
//   });

//   unzipper.on('extract', function (log) {
//     if (!failed) {
//       unzipper.list();
//     }
//   });

//   unzipper.on('list', function (files) {
//     let folders = [];
//     files.forEach(function(file) {
//       let folder = file.split(path.sep)[0];
//       if (folders.indexOf(folder) === -1) {
//         folders.push(folder);
//       }
//     });
//     if (!failed) {
//       cb(null, folders);
//     }
//   });

//   log.zip('extract', output);
//   unzipper.extract({
//     path: output,
//     filter: function (file) {
//       return file.type !== 'SymbolicLink';
//     }
//   });
// };