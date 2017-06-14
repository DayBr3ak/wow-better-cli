const log = require('npmlog');
const cheerio = require('cheerio');

import { request } from '../utils/request';

export class Curse {
  constructor() {
    this.addonsUrl = 'http://www.curse.com/addons/wow/';
  }

  scrapAddonInfos(body) {
    let $ = cheerio.load(body);
    let countdown = $('.countdown');
    let a = $('p a', countdown);

    let zipUrl = a.first().attr('data-href');
    let version = a.first().attr('data-file');
    return {
      zip: zipUrl,
      version: version
    };
  }

  /**
 * Scrapes a download URL from curse.com
 * @param  {String}   slug    The addon slug
 * @param  {String}   version Addon version, can be null.
 */
  async getDownloadURL(slug, version) {
    const url = this.addonsUrl + slug + '/' + (version || 'download');
    log.http('GET', url);
    const [res, body] = await request({ url: url });
    const addonInfos = this.scrapAddonInfos(body);
    if (!addonInfos.zip) {
      throw 'Failed scraping download URL. Does the addon exist, or did Curse change something?';
    }
    if (!addonInfos.version) {
      throw 'Failed scraping download URL. Did Curse change something?';
    }
    log.http(res.statusCode, url + ' (%d)', addonInfos.version);
    const onlineVersion = parseInt(addonInfos.version);
    return [addonInfos.zip, onlineVersion];
  }
}

