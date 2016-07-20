'use strict';
const request = require('request');
const log = require('npmlog');
const fs = require('fs');
const path = require('path');
const util = require('util');
const temp = require('temp').track();

log.addLevel('fs', 3000, { fg: 'cyan' }, 'file');
log.addLevel('zip', 3000, { fg: 'cyan' }, 'zip ');


exports.downloadZipToTempFile = function (url, cb) {
  temp.open('wow', function(err, info) {
    if (err) {
      return cb(err);
    }
    log.fs('temp', info.path);
    fs.closeSync(info.fd);
    log.http('GET', url);
    request({
      url: url,
      encoding: null
    }, function(err, res, data) {
      log.http(res.statusCode, url);
      if (err)  {
        return cb(err);
      }
      fs.writeFile(info.path, data, function(err) {
        log.fs('save', info.path);
        if (err) {
          return cb(err);
        }
        return cb(null, info.path);
      });
    });
  });
};

exports.obtainZipFile = function(source, addon, url, nocache, cachedir, callback) {
  var zipfilename = util.format('%s_%s__%s', source, addon, url.substr(url.lastIndexOf('/')+1));
  zipfilename = path.join(cachedir, zipfilename);
  if (!nocache && fs.existsSync(zipfilename)) {
      log.fs('cached', zipfilename);
      callback(null, zipfilename);
  } else {
    log.http('GET', url);
    request({
      url: url,
      encoding: null
    }, function(err, res, data) {
      log.http(res.statusCode, url);
      if (err) return callback(err);
      fs.writeFile(zipfilename, data, function(err) {
        log.fs('save', zipfilename);
        callback(err, zipfilename);
      });
    });
  }

};

exports.extractZip = function(zipfile, output, cb) {
  const DecompressZip = require('decompress-zip');
  let unzipper = new DecompressZip(zipfile);
  log.zip('file', zipfile);
  let failed = false;

  unzipper.on('error', function (err) {
    failed = true;
    cb(err);
  });

  unzipper.on('extract', function (log) {
    if (!failed) {
      unzipper.list();
    }
  });

  unzipper.on('list', function (files) {
    let folders = [];
    files.forEach(function(file) {
      let folder = file.split(path.sep)[0];
      if (folders.indexOf(folder) === -1) {
        folders.push(folder);
      }
    });
    if (!failed) {
      cb(null, folders);
    }
  });

  log.zip('extract', output);
  unzipper.extract({
    path: output,
    filter: function (file) {
      return file.type !== 'SymbolicLink';
    }
  });
};