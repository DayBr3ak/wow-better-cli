// cli.js
'use strict';

// scrape back your addons into addons.json



const log = require('npmlog');
const path = require('path');
const cli = require('cli');

const Save = require('./lib/save.js');
const Wow = require('./lib/wow.js');
const util = require('./lib/util.js');


log.addLevel('cli', 3000, { fg: 'cyan' }, 'CLI');
const DEFAULT_PLATFORM = 'curse';

let parseOptions = {
    platform: [ 'p', 'Select the platform of the addon.', 'string', DEFAULT_PLATFORM],          // -f, --file FILE   A file to process
    version: [ 'v', 'Install a specific version of the addon.', 'int', false],                 // -t, --time TIME   An access time
}

if (true) {
  parseOptions.debug = ['d', 'Debug flag', true, false];
}

cli.parse(
    parseOptions,
    ['install', 'update', 'checkupdate', 'uninstall', 'remove', 'installed', 'ls', 'changewow']
);

const commands = {
  install: install,
  changewow: changewow,
  ls: null,
  uninstall: uninstall,
  remove: uninstall,
  installed: listInstalledAddons,
  checkupdate: checkupdate,
  update: update,
}


cli.main(function (args, options) {
    console.log(args)
    console.log(options)
    findWowDir(options, (err, wow) => {
      let commandHandler = commands[cli.command];
      commandHandler(wow, args, options);
    })
})

function cliErrhandler(err) {
  if (err.code == "EPERM") {
    return log.error('info', "Please run this program as Administrator, your wow folder is in a protected directory");
  }
  log.error('error', err);
}

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
      return cliErrhandler('error wrong directory specified');
    }
    let newData = data || {};
    newData.wowdir = path.normalize(presumedWowdir);
    configFile.write(newData, (err) => {
      return cb(newData)
    })
  }

}

function findWowDir(options, cb) {
  //Figure out the user's WoW install directory
  var wowdir;

  if (options && options.debug) {
    return util.makeTmpWowFolder((err, tmpwowpath) => {
      if (err) {
        return cb(err)
      }

      return cb(null, new Wow(tmpwowpath, tmpwowpath));
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

function handleCliError() {

}

function install(wow, args, options) {
  log.cli('install', 'install cmd')

  if (args.length < 1) {
    // error message
    handleCliError();
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
        cliErrhandler(err);
    }
  })
}

function changewow(wow, args, options) {
  wow.saveFd.read((err, data) => {
    if (err) {
      return cliErrhandler(err);
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

function testls(wow, args, options) {
  log.cli('LS')
  let addonDir = path.join(wow.wowpath, 'Interface', 'AddOns');
  let stop = false;
  util.listMyAddonsInFolder(addonDir, (err, addonFolder) => {
    if (stop) {
      return
    }
    // stop = true;
    let projectName = util.getUrlNameFromAddon(addonFolder);
    console.log(projectName);
  })
}

function uninstall(wow, args, options) {
  log.cli('uninstall', 'uninstall cmd')

  if (args.length < 1) {
    // error message
    handleCliError();
    // log.cli('error', 'Should specify addon as argument')
    return
  }

  let addonName = args[0];
  wow.uninstall(addonName, (err) => {
    if (err && err == 'not found') {
      return log.error(`${addonName} not found`);
    }
    if (err) {
      return cliErrhandler(err);
    }
    log.info(`${addonName} uninstalled succesfully`);
  });
}

function listInstalledAddons(wow, args, options) {
  log.cli('listInstalledAddons');
  wow.getConfigData((err, data) => {
    if (err) {
      return cliErrhandler(err);
    }

    if (data && data.addons) {
      let names = Object.keys(data.addons);
      console.log(names.length + ' addon' + (names.length !== 1 ? 's' : '') + ' installed');
      names.forEach(function(addon) {
        console.log('- '+addon);
      });
    }
  })
}

function checkupdate(wow, args, options) {
  log.cli('checkupdate');

  if (args.length > 1) {
    return handleCliError();
  }
  if (args.length == 1) {
    let addonName = args[0];

    return wow.checkupdate(addonName, (err, hasUpdate, platform, zipUrl, version) => {
      if (err) {
        return cliErrhandler(err);
      }
      if (hasUpdate) {
         console.log('Update Available! Install using $ wow install %s', addonName);
      } else {
        console.log('No updated version found');
      }
    })
  }

  wow.checkAllAddonsForUpdate((err, updatesAvailable) => {
    if (err) {
      return cliErrhandler(err);
    }
    let num = updatesAvailable.length
    console.log('%s addon%s updates: %s', num, (num !== 1 ? 's have' : ' has'), updatesAvailable.join(', '));

  })
}

function update(wow, args, options) {
  if (args.length == 1) {
    // one addon
    let addonName = args[0];
    wow.update(addonName, (err, hasUpdate) => {
      if (err) {
        return cliErrhandler(err);
      }
      if (!hasUpdate) {
        console.log('No update available for ' + addonName);
      } else {
        console.log('succesfully updated ' + addonName)
      }
    })
    return;
  }

  wow.getConfigData((err, data) => {
    if (err) {
      return cliErrhandler(err);
    }
    if (data && data.addons) {
      Object.keys(data.addons).forEach(function(addonName) {
        wow.update(addonName, (err, hasUpdate) => {
          if (err) {
            cliErrhandler(err);
          }

          if (!hasUpdate) {
            // console.log('No update available for ' + addonName);
          } else {
            console.log('succesfully updated ' + addonName)
          }
        })
      });
    }
  })
}















