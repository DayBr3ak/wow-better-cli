
const log = require('npmlog');
const cheerio = require('cheerio');

import { request } from '../utils/request';

export class Tukui {
  constructor() {

  }

  async _getProject(project) {
    const url = 'http://tukui.org/api.php?project=' + encodeURIComponent(project);
    log.http('GET', url);
    const [res, body] = await request({ url: url, json: true});
    log.http(res.statusCode, url+' (%s)', body[0].version);
    return body[0];
  }

  async _getAddon(addon) {
    const url = 'http://tukui.org/api.php?addons=all';
    log.http('GET', url);
    const [res, body] = await request({ url: url, json: true});
    log.http(res.statusCode, url);
    console.log(body);
  }

  scrapAddonZipUrl(body) {
    let $ = cheerio.load(body);

    let container = $('#container');
    let link = $('a', container.first());
    let url = link.first().attr('href');

    return url
  }

  scrapAddonVersion(body) {
    let $ = cheerio.load(body);

    let container = $('#squaretabledouble');
    let row = $('tr', container).get(4);
    let td = $('td', row).get(1)
    let version = td.children[0].data
    return version
  }

  async getZipUrl(addonId) {
    const url = 'http://www.tukui.org/addons/index.php?act=download&id=' + addonId;
    log.http('GET', url);
    const [res, body] = await request({ url: url });
    let zipUrl = this.scrapAddonZipUrl(body);
    log.info('addonZipUrl', zipUrl);
    return zipUrl;
  }

  async getVersion(addonId) {
    const url = 'http://www.tukui.org/addons/index.php?act=view&id=' + addonId;
    log.http('GET', url);
    const [res, body] = await request({ url: url });
    let version = this.scrapAddonVersion(body);
    log.info('addon version', version);
    return version;
  }

  async getDownloadURL(addon, version) {
    if (version !== null) {
      log.warn('tukui', 'specific versions of tukui addons can\'t be installed.');
    }

    if (addon === 'tukui' || addon === 'elvui') {
      const data = await this._getProject(addon);
      return [data.url, data.version];
    }

    const tukuiRegex = /tukui:([0-9]+)$/;
    const isValid = tukuiRegex.exec(addon);
    let addonId;
    if (isValid !== null) {
      addonId = parseInt(isValid[1]);
      log.info('regex', isValid);
    } else {
      addonId = parseInt(addon);
    }
    if (!isNaN(addonId)) {
      let url = null;
      let version = null;

      const zipPromise = this.getZipUrl(addonId);
      const versionPromise = this.getVersion(addonId);

      return [await zipPromise, await versionPromise];
    }
    throw 'tukui: url format is not valid (' +  addon  + ')';
  }
}

