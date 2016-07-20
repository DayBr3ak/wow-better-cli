// cli.js
'use strict';

const log = require('npmlog');
const path = require('path');
const cli = require('cli');

const downloader = require('./lib/downloader');

log.addLevel('cli', 3000, { fg: 'cyan' }, 'CLI');
cli.parse(null, ['install', 'update', 'checkupdate', 'uninstall', 'installed', 'ls']);
cli.main(function (args, options) {
    let context = findWowDir()
    console.log(args)
    console.log(options)

    switch (cli.command) {
      case 'install': {
        install(context)
        break;
      }
    }
})

function findWowDir() {
  //Figure out the user's WoW install directory
  var wowdir;
  if (process.env.WOWPATH) {
    wowdir = process.env.WOWPATH;
  } else {
    log.warn('path', 'Using default WoW path, please set the WOWPATH env variable');
    wowdir = path.join('C:', 'Program Files (x86)', 'World Of Warcraft');
  }

  log.cli('wowDir', wowdir);

  var addonsdir = path.join(wowdir, 'Interface', 'AddOns');
  var savefile = path.join(wowdir, '.addons.json');
  return {
    wow: wowdir,
    addons: addonsdir,
    savefile: savefile
  }
}


function install(ctx) {
  log.cli('install', 'install cmd')

}