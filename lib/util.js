// util.js
'use strict';

const path = require('path');
const mkdirp = require('mkdirp');
const temp = require('temp').track();

exports.makeTmpWowFolder = (cb) => {
    temp.mkdir('wowfolder', function(err, wowFolder) {
        if (err) {
            return cb(err)
        }

        let interfaceDir = path.join(wowFolder, 'Interface')
        mkdirp(interfaceDir, (err) => {
        	if (err) {
        		return cb(err)
        	}

            let addonsDir = path.join(interfaceDir, 'AddOns')
            mkdirp(addonsDir, (err) => {
            	if (err) {
	        		return cb(err)
	        	}
                cb(null, wowFolder);
            })
        })
    })
}
