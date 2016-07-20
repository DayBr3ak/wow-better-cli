'use strict';
var request = require('request');
var async = require('async');
var log = require('npmlog');
var debug = require('debug')('wow:downloader');
var fs = require('fs');
var path = require('path');
var util = require('util');
var temp = require('temp').track();


log.addLevel('fs', 3000, { fg: 'cyan' }, 'file');
log.addLevel('zip', 3000, { fg: 'cyan' }, 'zip ');

exports.downloadAddonToTempFile = function(url, cb) {
  temp.open('wow', function(err, info) {
    if (err) 
      return cb(err);
    log.fs('temp', info.path);
    fs.closeSync(info.fd);
    log.http('GET', url);
    request({
      url: url,
      encoding: null
    }, function(err, res, data) {
      log.http(res.statusCode, url);
      if (err) return cb(err);
      fs.writeFile(info.path, data, function(err) {
        log.fs('save', info.path);
        cb(err, info.path);
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
  var DecompressZip = require('decompress-zip');
  var unzipper = new DecompressZip(zipfile);
  log.zip('file', zipfile);
  var failed = false;

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
    var folders = [];
    files.forEach(function(file) {
      var folder = file.split(path.sep)[0];
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