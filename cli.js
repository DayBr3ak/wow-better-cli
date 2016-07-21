// cli.js
'use strict';

const log = require('npmlog');
const path = require('path');
const cli = require('cli');

const Save = require('./lib/save.js');
const Wow = require('./lib/wow.js');

log.addLevel('cli', 3000, { fg: 'cyan' }, 'CLI');
const DEFAULT_PLATFORM = 'curse';

let parseOptions = {
    platform: [ 'p', 'Select the platform of the addon.', 'string', DEFAULT_PLATFORM],          // -f, --file FILE   A file to process
    version: [ 'v', 'Install a specific version of the addon.', 'int', false],                 // -t, --time TIME   An access time
}

if (true) {
  parseOptions.debug = ['d', 'Debug flag', false, true];
}

cli.parse(
    parseOptions,
    ['install', 'update', 'checkupdate', 'uninstall', 'installed', 'ls', 'changewow']
);

const commands = {
  install: install,
  changewow: changewow,

}


cli.main(function (args, options) {
    console.log(args)
    console.log(options)
    findWowDir(options, (err, wow) => {
      let commandHandler = commands[cli.command];
      commandHandler(wow, args, options);
    })
})

function promptWowDir(configFile, data, cb) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const DEFAULTS_WOWDIR = {
    '1': path.join('C:', 'Program Files', 'World Of Warcraft'),
    '2': path.join('C:', 'Program Files (x86)', 'World Of Warcraft')
  }

  console.log('Where is your World of Warcraft folder ?')
  console.log('  1. ' + DEFAULTS_WOWDIR['1'])
  console.log('  2. ' + DEFAULTS_WOWDIR['2'])
  console.log('  3. Other')

  rl.question('', (answer) => {
    if (answer === '3') {
      rl.question('Enter the path pls\n', (answer) => {
        log.cli('wowdir answer', 'should be in ' + answer);
        handleAnswer(answer)
        rl.close();
      })
    } else {
      handleAnswer(DEFAULTS_WOWDIR[answer])
      rl.close();
    }
  })

  let handleAnswer = (presumedWowdir) => {
    if (!presumedWowdir) {
      throw 'error wrong directory specified';
    }
    let newData = data || {};
    newData.wowdir = presumedWowdir;
    configFile.write(newData, (err) => {
      return cb(newData)
    })
  }

}

function findWowDir(options, cb) {
  //Figure out the user's WoW install directory
  var wowdir;

  if (options && options.debug) {
    const util = require('./lib/util.js');
    return util.makeTmpWowFolder((err, tmpwowpath) => {
      if (err) {
        return cb(err)
      }

      return cb(null, new Wow(tmpwowpath));
    })
  }

  let wowFoundCallback = (data) => {
    log.cli('wowDir', data.wowdir);
    cb(null, new Wow(data.wowdir));
  }

  let configFile = new Save();
  configFile.read((err, data) => {
    if (!data || !data.wowdir) {
      // prompt user
      log.cli('shouldprompt', 'hi');

      promptWowDir(configFile, data, wowFoundCallback);

    } else {
      return wowFoundCallback(data);
    }
  })
}


function install(wow, args, options) {
  log.cli('install', 'install cmd')

  if (args.length < 1) {
    // error message
    log.cli('error', 'Should specify addon as argument')
    return
  }

  let addonName = args[0];
  let platform = options.platform;
  let version = options.version ? options.version : null;

  log.cli('install', `try to install ${addonName} with platform ${platform} and version ${version}`);
  if (!wow.isPlatformValid(platform)) {
    // error message
    log.cli('error', `platform ${platform} is invalid, platform is set to default '${DEFAULT_PLATFORM}'`);
    platform = DEFAULT_PLATFORM;
  }

  wow.install(platform, addonName, version, (err) => {
    if (err) {
        log.cli('error', err);
        // throw err;
    }
  })
}

function changewow(wow, args, options) {
  wow.saveFd.read((err, data) => {
    if (err) {
      throw err;
    }
    data.wowdir = undefined;

    if (args < 1) {
      promptWowDir(wow.saveFd, data, (data) => {
        log.cli('changewowdir', 'new dir is ' + data.wowdir)
      })
    } else {
      // user specified wowdir in the commandline
      data.wowdir = args[0];
      wow.saveFd.write(data, (err) => {
        log.cli('changewowdir', 'new dir is ' + data.wowdir)
      })
    }
  })
}