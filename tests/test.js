import "babel-polyfill";

if (global.DEBUG === undefined) {
  global.DEBUG = true;
}

const fs = require('fs');
const path = require('path');

const chai = require('chai');
const assert = chai.assert;
const should = chai.should();

const log = require('npmlog');
log.addLevel('tests', 3000, { fg: 'cyan' }, 'CLI');
log.level = 'debug';


const IsNumeric = (n) => {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

import * as downloader from '../dist/downloader';
const curse = downloader.platforms.curse;

import { Wow } from '../dist/wow';
import * as util from '../dist/utils/util';
import { exists } from '../dist/utils/fileutil';
const makeTmpWowFolder = util.makeTmpWowFolder;

const testTimeout = 8 * 1000;

describe('Util', function() {
  describe('parsePlatform', function() {
    it('should return tukui:128', function() {
      let result = util.parsePlatform('tukui:128');
      result.platform.should.equal('tukui');
      result.addon.should.equal('tukui:128');
    })

    it('should return tukui', () => {
      let result = util.parsePlatform('tukui:tukui');
      result.platform.should.equal('git');
      // result.addon.should.equal('tukui');

      result = util.parsePlatform('tukui');
      result.platform.should.equal('git');
      // result.addon.should.equal('tukui');
    })

    it('should return elvui', () => {
      let result = util.parsePlatform('tukui:elvui');
      result.platform.should.equal('git');
      // result.addon.should.equal('elvui');

      result = util.parsePlatform('elvui');
      result.platform.should.equal('git');
      // result.addon.should.equal('elvui');
    })

    it('should return HardYards-22379', function() {
      let check = (result) => {
        result.platform.should.equal('wowinterface');
        result.addon.should.equal('wowinterface:HardYards-22379');
      }
      check(util.parsePlatform('http://www.wowinterface.com/downloads/info22379-HardYards.html'))
      check(util.parsePlatform('www.wowinterface.com/downloads/info22379-HardYards.html'))
      check(util.parsePlatform('http://wowinterface.com/downloads/info22379-HardYards.html'))
      check(util.parsePlatform('wowinterface.com/downloads/info22379-HardYards.html'))
      check(util.parsePlatform('wowinterface.com/downloads/info22379-HardYards'))
      check(util.parsePlatform('wowinterface:HardYards-22379'))
    })

    it('should return a git url', () => {
      let check = (result, url) => {
        result.platform.should.equal('git');
        result.addon.should.equal(url);
      }

      let url = 'http://git.tukui.org/Azilroka/addonskins.git'
      check(util.parsePlatform(url), url);
    })
  })
})

describe('Curse', function() {
  describe('getDownloadUrl()', function() {

    it('should return the download url of an addon', async function() {
      this.timeout(testTimeout);

      try {
        let [url, version] = await curse.getDownloadURL('Ace3', null);
        log.tests('url,version', url, version);
        should.exist(url);
        should.exist(version);
        const zipRegex = /\.zip/;
        let hasZip = zipRegex.exec(url);

        should.not.equal(null, hasZip);
        should.not.equal(null, version);

        IsNumeric(version).should.equal(true);
      } catch (err) {
        log.error('test', err);
        should.not.exist(err);
      }
    })

    it('should tell the new version of the addon', async function() {
      this.timeout(testTimeout)
      try {
        const wowPath = await makeTmpWowFolder();
        should.exist(wowPath);
        const wow = new Wow(wowPath, wowPath);
        const mockAddonData = {
          addons: {
            'Ace3': {
              platform: 'curse',
              version: 0,
              folders: null
            }
          }
        }
        await wow.saveFd.write(mockAddonData);
        const [isNew, platform, zipUrl, version] = await wow.checkupdate('Ace3');
        isNew.should.equal(true);
      } catch(err) {
        log.error('test', err);
        should.not.exist(err);
      }
    })

    it('should tell addon version is up to date (be sure to update the number ...)', async function() {
      this.timeout(testTimeout)
      try {
        const wowPath = await makeTmpWowFolder();
        should.exist(wowPath);
        let wow = new Wow(wowPath, wowPath);
        let mockAddonData = {
          addons: {
            'Ace3': {
              platform: 'curse',
              version: 2398595,
              folders: null
            }
          }
        }
        await wow.saveFd.write(mockAddonData);
        const [isNew, platform, zipUrl, version] = await wow.checkupdate('Ace3');
        isNew.should.equal(false);
      } catch(err) {
        log.error('test', err);
        should.not.exist(err);
      }
    })


    it('should tell the new version of multiple addons (be sure to update the number ...)', async function() {
      this.timeout(30 * 1000);
      try {
        const wowPath = await makeTmpWowFolder();
        should.exist(wowPath);
        const wow = new Wow(wowPath, wowPath);
        let mockAddonData = {
          addons: {
            'Ace3': {
              platform: 'curse',
              version: 2398595,
              folders: null
            },
            'Auctionator': {
              platform: 'curse',
              version: 0,
              folders: null
            },
            'Bagnon': {
              platform: 'curse',
              version: 0,
              folders: null
            }
          }
        };
        await wow.saveFd.write(mockAddonData);
        const addonsToUpdate = await wow.checkAllAddonsForUpdate();
        addonsToUpdate.length.should.equal(2);
      } catch(err) {
        log.error('test', err);
        should.not.exist(err);
      }
    })
  })
});

describe('downloader', function() {
  describe('downloadZipToTempFile()', function() {
    it('should download the zip of an addon', async function() {
      this.timeout(testTimeout);

      try {
        const [url, version] = await curse.getDownloadURL('Ace3', null);
        const path = await downloader.downloadZipToTempFile(url);
        should.exist(path);
        const fileExist = await exists(path);
        fileExist.should.equal(true);
      } catch(err) {
        log.error('test', err);
        should.not.exist(err);
      }
    })
  })
});

describe('download wow addon into wow folder', function() {
  describe('with tukui', function () {
    it('should download an addon, extract it, and place it into the wow interface addons folder', async function() {
      this.timeout(testTimeout * 2);

      try {
        const wowPath = await makeTmpWowFolder();
        should.exist(wowPath);
        let wow = new Wow(wowPath, wowPath);
        await wow.install('tukui:128', null);
        const fileExist = await exists(wow.getSaveFile());
        fileExist.should.equal(true);
      } catch(err) {
        log.error('test', err);
        should.not.exist(err);
      }

    })
  })

  describe('with wowinterface', function () {
    it('should download an addon, extract it, and place it into the wow interface addons folder', async function() {
      this.timeout(testTimeout * 2);

      try {
        const wowPath = await makeTmpWowFolder();
        should.exist(wowPath);
        let wow = new Wow(wowPath, wowPath);
        await wow.install('http://www.wowinterface.com/downloads/info22379-HardYards.html', null);
        const fileExist = await exists(wow.getSaveFile());
        fileExist.should.equal(true);
      } catch(err) {
        log.error('test', err);
        should.not.exist(err);
      }

    })
  })

  describe('with git', function () {
    it('should download an addon, extract it, and place it into the wow interface addons folder', async function() {
      this.timeout(testTimeout * 2);

      try {
        const wowPath = await makeTmpWowFolder();
        should.exist(wowPath);
        let wow = new Wow(wowPath, wowPath);
        await wow.install('http://git.tukui.org/Tukz/tukui.git', null);
        const fileExist = await exists(wow.getSaveFile());
        fileExist.should.equal(true);
      } catch(err) {
        log.error('test', err);
        should.not.exist(err);
      }

    })
  })

  describe('with curse', function () {
    it('should download an addon, extract it, and place it into the wow interface addons folder', async function() {
      this.timeout(testTimeout * 2);

      try {
        const wowPath = await makeTmpWowFolder();
        should.exist(wowPath);
        let wow = new Wow(wowPath, wowPath);
        await wow.install('Ace3', null);
        const fileExist = await exists(wow.getSaveFile());
        fileExist.should.equal(true);
      } catch(err) {
        log.error('test', err);
        should.not.exist(err);
      }
    })

    it('should do as above and delete it', async function() {
      this.timeout(testTimeout);
      try {
        const wowPath = await makeTmpWowFolder();
        should.exist(wowPath);
        let wow = new Wow(wowPath, wowPath);
        await wow.install('Ace3', null);
        const fileExist = await exists(wow.getSaveFile());
        fileExist.should.equal(true);

        // check if toc exists
        const Ace3toc = path.join(wow.getAddonsDir(), 'Ace3', 'Ace3.toc');
        let tocExist = await exists(Ace3toc);
        tocExist.should.equal(true);
        // now delete
        await wow.uninstall('Ace3');
        tocExist = await exists(Ace3toc);
        tocExist.should.equal(false);

      } catch(err) {
        log.error('test', err);
        should.not.exist(err);
      }
    })

    it('should install 3 addons and reinstall them', async function() {
      this.timeout(30 * 1000);

      try {
        const wowPath = await makeTmpWowFolder();
        const wow = new Wow(wowPath, wowPath);
        const addons = ['ace3', 'tukui:128', 'http://www.wowinterface.com/downloads/info22379-HardYards.html'];
        const len = addons.length;

        let results = await wow.installAddonList(addons);
        results.length.should.equal(len);
        const data = await wow.getConfigData();
        should.exist(data);
        should.exist(data.addons);
        Object.keys(data.addons).length.should.equal(len);

        const addonsReinstall = [];
        for (let addonName of Object.keys(data.addons)) {
          const version = data.addons[addonName].version;
          addonsReinstall.push({ name: addonName, version: version });
        }
        addonsReinstall.length.should.equal(len);
        results = await wow.installAddonList(addonsReinstall);
        results.length.should.equal(len);
      } catch(err) {
        log.error('test', err);
        should.not.exist(err);
      }
    })
  })
})


