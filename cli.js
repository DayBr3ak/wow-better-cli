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