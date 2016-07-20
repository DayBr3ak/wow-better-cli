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

                cb(null, addonsDir);
            })
        })
    })
}

describe('Curse', function() {
    const curse = require('../lib/curse.js');
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

        it('promise version: should return the download url of an addon', function(done) {
            this.timeout(testTimeout)
            curse.getDownloadURL('Ace3', null)
                .then((infos) => {
                    should.exist(infos);
                    let {url, version} = infos;
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
    })
});

describe('downloader', function() {
    const curse = require('../lib/curse.js');
    const downloader = require('../lib/downloader.js');
    describe('downloadAddonToTempFile()', function() {
        it('should download the zip of an addon', function(done) {
            this.timeout(testTimeout);
            curse.getDownloadURL('Ace3', null, (err, url, version) => {
                downloader.downloadAddonToTempFile(url, (err, path) => {
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
    const curse = require('../lib/curse.js');
    const downloader = require('../lib/downloader.js');
    describe('with curse', function () {
        it('should download an addon, extract it, and place it into the wow interface addons folder', function(done) {
            this.timeout(testTimeout);
            let downloadAddon = (output) => {
                curse.getDownloadURL('Ace3', null, (err, url, version) => {
                    downloader.downloadAddonToTempFile(url, (err, path) => {
                        downloader.extractZip(path, output, (err, folders) => {
                            should.not.exist(err);
                            should.exist(folders);
                            done()

                        })
                    });
                })
            };
            makeTmpWowFolder(function(err, addonPath) {
                should.not.exist(err);
                should.exist(addonPath);
                downloadAddon(addonPath);
            })
        })
    })
})

