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

const curse = require('../lib/curse.js');
const downloader = require('../lib/downloader.js');
const Wow = require('../lib/index.js');


const testTimeout = 20*1000;

const makeTmpWowFolder = (cb) => {
    temp.mkdir('wowfolder', function(err, wowFolder) {
        if (err) {
            return cb(err)
        }

        let interfaceDir = path.join(wowFolder, 'Interface')
        mkdirp(interfaceDir, (err) => {
            should.not.exist(err)
            let addonsDir = path.join(interfaceDir, 'AddOns')
            mkdirp(addonsDir, (err) => {
                should.not.exist(err)

                cb(null, wowFolder);
            })
        })
    })
}

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

                let wow = new Wow(wowPath);
                let mockAddonData = {
                    'Ace3': {
                        platform: 'curse',
                        version: 0,
                        folders: null
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

                let wow = new Wow(wowPath);
                wow.install('curse', 'Ace3', null, (err) => {
                    should.not.exist(err);
                    fs.access(wow.getSaveFile(), fs.constants.R_OK | fs.constants.W_OK, (err) => {
                        should.not.exist(err);
                        done();
                    });
                })
            })
        })
    })
})

