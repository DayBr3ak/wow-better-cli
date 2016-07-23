// test.js
'use strict';
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const temp = require('temp').track();

const chai = require('chai');
const assert = chai.assert;
const should = chai.should();

const IsNumeric = (n) => {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

const downloader = require('../lib/downloader');
const curse = downloader.platforms.curse;

const Wow = require('../lib/wow.js');
const util = require('../lib/util.js');
const makeTmpWowFolder = util.makeTmpWowFolder;

const testTimeout = 30*1000;

// describe('Tukui', function() {
//     describe('install', function() {
//         it('should download tukui project', function(done) {
//             this.timeout(testTimeout);
//             makeTmpWowFolder
//         })
//     })
// })

describe('Util', function() {
    describe('parsePlatform', function() {
        it('should return tukui:128', function() {
            let result = util.parsePlatform('tukui:128');
            result.platform.should.equal('tukui');
            result.addon.should.equal('tukui:128');
        })

        it('should return tukui', () => {
            let result = util.parsePlatform('tukui:tukui');
            result.platform.should.equal('tukui');
            result.addon.should.equal('tukui');

            result = util.parsePlatform('tukui');
            result.platform.should.equal('tukui');
            result.addon.should.equal('tukui');
        })

        it('should return elvui', () => {
            let result = util.parsePlatform('tukui:elvui');
            result.platform.should.equal('tukui');
            result.addon.should.equal('elvui');

            result = util.parsePlatform('elvui');
            result.platform.should.equal('tukui');
            result.addon.should.equal('elvui');
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
    })
})

describe('Curse', function() {
    describe('getDownloadUrl()', function() {

        it('should return the download url of an addon', function(done) {
            this.timeout(testTimeout)
            curse.getDownloadURL('Ace3', null, (err, url, version) => {
                should.not.exist(err);
                should.exist(url);
                should.exist(version);
                const zipRegex = /\.zip/;
                let hasZip = zipRegex.exec(url);

                should.not.equal(null, hasZip);
                should.not.equal(null, version);

                IsNumeric(version).should.equal(true);
                done()
            })
        })

        it('should tell the new version of the addon', function(done) {
            this.timeout(testTimeout)
            makeTmpWowFolder(function(err, wowPath) {
                should.not.exist(err);
                should.exist(wowPath);

                let wow = new Wow(wowPath, wowPath);
                let mockAddonData = {
                    addons: {
                        'Ace3': {
                            platform: 'curse',
                            version: 0,
                            folders: null
                        }
                    }
                }
                wow.saveFd.write(mockAddonData, (err) => {
                    should.not.exist(err);
                    wow.checkupdate('Ace3', (err, isNew, platform, zipUrl, version) => {
                        should.not.exist(err);
                        isNew.should.equal(true);
                        done()
                    })
                })
            })
        })

        it('should tell addon version is up to date (be sure to update the number ...)', function(done) {
            this.timeout(testTimeout)
            makeTmpWowFolder(function(err, wowPath) {
                should.not.exist(err);
                should.exist(wowPath);

                let wow = new Wow(wowPath, wowPath);
                let mockAddonData = {
                    addons: {
                        'Ace3': {
                            platform: 'curse',
                            version: 924908,
                            folders: null
                        }
                    }
                }
                wow.saveFd.write(mockAddonData, (err) => {
                    should.not.exist(err);
                    wow.checkupdate('Ace3', (err, isNew, platform, zipUrl, version) => {
                        should.not.exist(err);
                        isNew.should.equal(false);
                        done()
                    })
                })
            })
        })


        it('should tell the new version of multiple addons', function(done) {
            this.timeout(testTimeout)
            makeTmpWowFolder(function(err, wowPath) {
                should.not.exist(err);
                should.exist(wowPath);

                let wow = new Wow(wowPath, wowPath);
                let mockAddonData = {
                    addons: {
                        'Ace3': {
                            platform: 'curse',
                            version: 924908,
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
                }
                wow.saveFd.write(mockAddonData, (err) => {
                    should.not.exist(err);
                    wow.checkAllAddonsForUpdate((err, addonsToUpdate) => {
                        should.not.exist(err);
                        addonsToUpdate.length.should.equal(2);
                        done();
                    })
                })
            })
        })
    })
});

describe('downloader', function() {
    describe('downloadZipToTempFile()', function() {
        it('should download the zip of an addon', function(done) {
            this.timeout(testTimeout);
            curse.getDownloadURL('Ace3', null, (err, url, version) => {
                downloader.downloadZipToTempFile(url, (err, path) => {
                    should.not.exist(err);
                    should.exist(path);
                    fs.access(path, fs.constants.R_OK | fs.constants.W_OK, (err) => {
                        should.not.exist(err);
                        done();
                    });
                })
            })
        })
    })
});

describe('download wow addon into wow folder', function() {
    describe('with curse', function () {
        it('should download an addon, extract it, and place it into the wow interface addons folder', function(done) {
            this.timeout(testTimeout);
            makeTmpWowFolder(function(err, wowPath) {
                should.not.exist(err);
                should.exist(wowPath);

                let wow = new Wow(wowPath, wowPath);
                wow.install('Ace3', null, (err) => {
                    should.not.exist(err);
                    fs.access(wow.getSaveFile(), fs.constants.R_OK | fs.constants.W_OK, (err) => {
                        should.not.exist(err);
                        done();
                    });
                })
            })
        })

        it('should do as above and delete it', function(done) {
            this.timeout(testTimeout);
            let deleteAddon = (wow) => {
                wow.uninstall('Ace3', (err) => {
                    let Ace3toc = path.join(wow.getAddonsDir(), 'Ace3', 'Ace3.toc');
                    fs.access(Ace3toc, fs.constants.R_OK | fs.constants.W_OK, (err) => {
                        should.exist(err);
                        err.code.should.equal('ENOENT')
                        done();
                    });
                })
            }

            makeTmpWowFolder(function(err, wowPath) {
                let wow = new Wow(wowPath, wowPath);
                wow.install('Ace3', null, (err) => {
                    fs.access(wow.getSaveFile(), fs.constants.R_OK | fs.constants.W_OK, (err) => {
                        should.not.exist(err);
                        deleteAddon(wow);
                    });
                })
            })
        })

        it('should install 3 addons and reinstall them', function(done) {
            this.timeout(testTimeout * 2);
            makeTmpWowFolder((err, wowPath) => {
                let wow = new Wow(wowPath, wowPath);

                let addons = ['ace3', 'tukui:128', 'http://www.wowinterface.com/downloads/info22379-HardYards.html'];
                util.installAddonList(wow, addons, (err, results) => {
                    should.not.exist(err);
                    results.length.should.equal(3);

                    wow.getConfigData((err, data) => {
                        should.not.exist(err);
                        should.exist(data);
                        should.exist(data.addons);
                        Object.keys(data.addons).length.should.equal(3);

                        let addonsReinstall = [];
                        Object.keys(data.addons).forEach((addonName) => {
                            let version = data.addons[addonName].version;
                            let p = {name: addonName, version: version};
                            addonsReinstall.push(p);
                        });

                        addonsReinstall.length.should.equal(3);
                        util.installAddonList(wow, addonsReinstall, (err, results) => {
                            should.not.exist(err);
                            results.length.should.equal(3);
                            done();
                        })
                    })
                })
            })
        })
    })
})


