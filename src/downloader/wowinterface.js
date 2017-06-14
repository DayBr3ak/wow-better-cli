
const log = require('npmlog');
const util = require('util');
import { request } from '../utils/request';

const mockingstring = 'minion-sucks';

export class Wowinterface {
  constructor() {
    this.idRegex = /(?:info|download)?([0-9]+)(?:\-(?:[A-Za-z0-9-_]+)?(?:\.html)?)?/;
    this.versionRegex = /<div id="version">Version: ([A-Za-z0-9\s-_.]+)<\/div>/;
    this.nameRegex = /http:\/\/www\.wowinterface\.com\/downloads\/info([0-9]+)\-([A-Za-z0-9-_.]+).html/;
  }

  craftDownloadURL(addonid, name) {
    return util.format('http://cdn.wowinterface.com/downloads/file%s/%s.zip', addonid, name);
  }

  craftInfoURL(addonid) {
    return util.format('http://www.wowinterface.com/downloads/info%s-%s.html', addonid, mockingstring);
  }

  extractID(input) {
    const result = this.idRegex.exec(input);
    //if result found && result is number
    if (result && result[1] && String(parseInt(result[1])) === result[1]) {
      return parseInt(result[1]);
    }
    throw "AddonId doesn't exist ( " + input + " )";
  }

  async getDownloadURL(addon, pVersion) {
    if (pVersion !== null) {
      log.warn('wowinterface', 'specific versions of wowinterface addons can\'t be installed (yet, is possible, will come soon).');
    }
    const addonid = this.extractID(addon);
    const url = this.craftInfoURL(addonid);
    log.http('GET', url);
    const [res, body] = await request({ url: url});
    log.http(res.statusCode, url);
    const versionresult = this.versionRegex.exec(body);
    const nameresult = this.nameRegex.exec(body);
    let name, version;
    if (versionresult[1]) {
      version = versionresult[1];
    } else {
      throw 'Unable to find version string in webpage. Did wowinterface change something?';
    }
    if (nameresult && parseInt(nameresult[1]) === addonid && nameresult[2]) {
      name = nameresult[2];
    } else {
      throw 'Unable to find name string in webpage. Did wowinterface change something?';
    }
    const newAddonName = util.format('%s-%s', addonid, name);
    return [this.craftDownloadURL(addonid, name), version, newAddonName];
  }
}
