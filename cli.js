// cli.js
'use strict';

const log = require('npmlog');
const path = require('path');
const cli = require('cli');

const downloader = require('./lib/downloader');

log.addLevel('cli', 3000, { fg: 'cyan' }, 'CLI');

cli.parse(null, ['install', 'update', 'checkupdate', 'uninstall', 'installed', 'ls']);

switch (cli.command) {
	case 'install': {
		log.cli('install', 'install cmd')
		break;
	}
}


//Figure out the user's WoW install directory
var wowdir;
if (process.env.WOWPATH) {
  wowdir = path.resolve(process.env.WOWPATH);
} else {
  log.warn('path', 'Using default WoW path, please set the WOWPATH env variable');
  wowdir = path.join('C:', 'Program Files (x86)', 'World Of Warcraft');
}

var addonsdir = path.join(wowdir, 'Interface', 'AddOns');
var savefile = path.join(wowdir, '.addons.json');