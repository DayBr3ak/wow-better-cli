'use strict';
const log = require('npmlog');
const request = require('request');
const cheerio = require('cheerio');

let scrapAddonInfos = (body) => {
  let $ = cheerio.load(body);
  let countdown = $('.countdown')
  let a = $('p a', countdown)

  let zipUrl = a.first().attr('data-href')
  let version = a.first().attr('data-file')
  return {
    zip: zipUrl,
    version: version
  };
};

exports.addonsUrl = 'http://www.curse.com/addons/wow/'

/**
 * Scrapes a download URL from curse.com
 * @param  {String}   slug    The addon slug
 * @param  {String}   version Addon version, can be null.
 * @param  {Function} cb      Callback
 */
exports.getDownloadURL = function (slug, version, cb) {
  var url = exports.addonsUrl + slug + '/' + (version || 'download');
  log.http('GET', url);
  request.get(url, (err, res, body) => {
    if (err) {
      return cb(err);
    }

    let addonInfos = scrapAddonInfos(body);
    if (!addonInfos.zip) {
      const error = new Error('Failed scraping download URL. Does the addon exist, or did Curse change something?');
      return cb(error);
    }
    if (!addonInfos.version) {
      const error = new Error('Failed scraping download URL. Did Curse change something?');
      return cb(error);
    }
    log.http(res.statusCode, url + ' (%d)', addonInfos.version);
    let version;
    try {
      version = parseInt(addonInfos.version);
    } catch(e) {
     return cb(e);
    }
    cb(null, addonInfos.zip, version);
  });
};
