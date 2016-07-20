// test.js
'use strict';
const chai = require('chai');
const assert = chai.assert;
const should = chai.should();

const IsNumeric = (n) => {
    return !isNaN(parseFloat(n)) && isFinite(n);
}


describe('Curse', () => {
    const curse = require('../lib/curse.js');
    describe('getDownloadUrl()', () => {
        it('should return the download url of an addon', (done) => {
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
    })
});

describe('downloader', () => {
    const curse = require('../lib/curse.js');
    const downloader = require('../downloader.js');
    describe('getDownloadUrl()', () => {
        it('should return the download url of an addon', (done) => {
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
    })
});

