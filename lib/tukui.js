'use strict';
var request = require('request');
var log = require('npmlog');
const cheerio = require('cheerio');

var tukui = {};

tukui._getProject = function(project, cb) {
  var url = 'http://tukui.org/api.php?project='+encodeURIComponent(project);
  log.http('GET', url);
  request.get({
    url: url,
    json: true
  }, function(err, res, body) {
    if (err) return cb(err);
    log.http(res.statusCode, url+' (%s)', body[0].version);
    cb(null, body[0]);
  });
};

tukui._getAddon = function(addon, cb) {
  var url = 'http://tukui.org/api.php?addons=all';
  log.http('GET', url);
  request.get({
    url: url,
    json: true
  }, function(err, res, body) {
    log.http(res.statusCode, url);
    if (err) return cb(err);
    console.log(body);
  });
};

let scrapAddonZipUrl = (body) => {
  let $ = cheerio.load(body);

  let container = $('#container');
  let link = $('a', container.first());
  let url = link.first().attr('href');

  return url
};
let scrapAddonVersion = (body) => {
  let $ = cheerio.load(body);

  let container = $('#squaretabledouble');
  let row = $('tr', container).get(4);
  let td = $('td', row).get(1)
  let version = td.children[0].data
  return version
};

let getZipUrl = (addonId, cb) => {
  let url = 'http://www.tukui.org/addons/index.php?act=download&id=' + addonId;
  log.http('GET', url);
  request.get({
    url: url
  }, (err, res, body) => {
    if (err) {
      return cb(err);
    }
    let zipUrl = scrapAddonZipUrl(body);
    log.info('addonZipUrl', zipUrl);
    cb(null, zipUrl, null);
  })
}

let getVersion = (addonId, cb) => {
  let url = 'http://www.tukui.org/addons/index.php?act=view&id=' + addonId;
  log.http('GET', url);
  request.get({url: url}, (err, res, body) => {
    if (err) {
      return cb(err);
    }
    let version = scrapAddonVersion(body);
    log.info('addon version', version);
    cb(null, null, version);
  })
}

tukui.getDownloadURL = function(addon, version, cb) {
  if (version !== null) {
    log.warn('tukui', 'specific versions of tukui addons can\'t be installed.');
  }
  if (addon === 'tukui' || addon === 'elvui') {
    return tukui._getProject(addon, function(err, data) {
      if (err) return cb(err);
      cb(null, data.url, data.version);
    });
  }

  const tukuiRegex = /tukui:([0-9]+)$/;
  const isValid = tukuiRegex.exec(addon);
  if (isValid != null) {
    let addonId = parseInt(isValid[1]);
    log.info('regex', isValid);
    let url = null;
    let version = null;
    let callback = (err, pUrl, pVersion) => {
      if (err) {
        return cb(err);
      }
      if (pUrl) {
        url = pUrl;
      }
      if (pVersion) {
        version = pVersion;
      }

      if (url && version) {
        cb(null, url, version);
      }
    }
    getZipUrl(addonId, callback);
    getVersion(addonId, callback);
  }
};

module.exports = tukui;