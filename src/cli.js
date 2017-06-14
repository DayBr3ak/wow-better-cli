// cli.js

const log = require('npmlog');
const path = require('path');
const cli = require('cli');
const archy = require('archy');

import { Save } from './save';
import { Wow } from './wow';
import * as util from './utils/util';

log.addLevel('cli', 3000, { fg: 'cyan' }, 'CLI');

if (global.DEBUG === undefined) {
  global.DEBUG = true;
}
const DEFAULT_PLATFORM = 'curse';
const DEFAULTS_WOWDIR = {
  '1': path.join('C:', 'Program Files', 'World Of Warcraft'),
  '2': path.join('C:', 'Program Files (x86)', 'World Of Warcraft'),
  '3': path.join('C:', 'World Of Warcraft'),
  '4': path.join('D:', 'World Of Warcraft')
}

let parseOptions = {
  platform: [ 'p', 'Select the platform of the addon.', 'string', DEFAULT_PLATFORM],          // -f, --file FILE   A file to process
  version: [ 'v', 'Install a specific version of the addon.', 'int', false],                 // -t, --time TIME   An access time
  verbose: [ 'd', 'Add logging information', true, false],
}

class CliManager {
  constructor() {
    this.commands = {};
  }

  async promptWowDir(configFile, data={}) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('Where is your World of Warcraft folder ?');
    for (let n of Object.keys(DEFAULTS_WOWDIR)) {
      console.log(`  ${n}. ${DEFAULTS_WOWDIR[n]}`);
    }
    console.log(`  ${DEFAULTS_WOWDIR.length}. Other`)

    const question = (questionString) => {
      return new Promise((resolve) => {
        rl.question(questionString, (answer) => {
          resolve(answer);
          rl.close();
        });
      });
    };
    // const question = (q) => return new Promise(r => rl.question(q, r));

    const answer = await question('');
    let wowdir = null;

    if (parseInt(answer) >= DEFAULTS_WOWDIR.length) {
      const askedPath = await question('Enter the path:\n');
      log.cli('wowdir answer', 'should be in ' + askedPath);
      wowdir = askedPath;
    } else {
      wowdir = DEFAULTS_WOWDIR[answer];
    }
    //   default: {
    //     throw 'Wrong choice, please enter 1, 2 or 3';
    //   }
    // }

    if (!wowdir) { // FIXME actually check if dir exists
      throw 'error wrong directory specified'
    }
    data.wowdir = path.normalize(wowdir);
    await configFile.write(data);
    return wowdir;
  }

  async findWowDir(options) {
    // Figure out the user's WoW install directory
    let wowdir = null;
    if (global.DEBUG) {
      const tmpwowpath = await util.makeTmpWowFolder();
      return new Wow(tmpwowpath, tmpwowpath);
    }
    const configFile = new Save();
    const data = await configFile.read();
    if (!data || !data.wowdir) {
      // prompt user
      log.cli('shouldprompt', 'hi');
      wowdir = await this.promptWowDir(configFile, data);
    } else {
      wowdir = data.wowdir;
    }
    log.cli('wowDir', wowdir);
    return new Wow(wowdir);
  }

  add(commandName, handler) {
    this.commands[commandName] = handler;
  }

  getCommands() {
    return Object.keys(this.commands);
  }

  setup() {
    cli.parse(
      parseOptions,
      this.getCommands()
    );

    cli.main(async (args, options) => {
      if (global.DEBUG) {
        console.log(args)
        console.log(options)
        log.level = 'debug'
      } else if (options && options.verbose == 'true') {
        log.level = 'info';
      } else {
        log.level = 'warn';
      }

      try {
        const wow = await this.findWowDir(options);
        let commandHandler = this.commands[cli.command];
        await commandHandler(wow, args, options);
      } catch(err) {
        cliErrhandler(err);
      }
    })
  }
}

function cliErrhandler(err) {
  if (err.code === "EPERM") {
    return cli.error("Please run this program as Administrator, your wow folder is in a protected directory");
  }
  if (err.code === "ARGS_ERROR") {
    return cli.error('ArgsError: ' + err.message);
  }
  cli.error(err);
  log.error('cli', err);
  process.exit(1);
}

function handleCliError(wow) {
  betterHelp(wow);
}

const manager = new CliManager();
manager.add('install', async (wow, args, options) => {
  log.cli('install', 'install cmd')
  if (args.length < 1) {
    throw {code: 'ARGS_ERROR', message: 'need at least one addon to install'};
  }
  const addons = args;
  const platform = options.platform;
  const version = options.version ? options.version : null;
  try {
    const results = await util.installAddonList(wow, addons);
    for (let r of results) {
      cli.ok('Installed ' + r);
    }
  } catch(err) {
    throw 'error in batch install';
  }
});

manager.add('changewow', async (wow, args, options) => {
  const data = await wow.saveFd.read();
  delete data.wowdir;
  if (args.length < 1) {
    const newWowdir = await manager.promptWowDir(wow.saveFd, data);
    log.cli('changewowdir', 'new dir is ' + newWowdir);
  } else if (args.length === 1) {
    // user specified wowdir in the commandline
    data.wowdir = args[0];
    await wow.saveFd.write(data);
    log.cli('changewowdir', 'new dir is ' + data.wowdir);
  } else {
    throw {code: 'ARGS_ERROR', message: 'Only 0 or 1 arguments'};
  }
});

manager.add('testls', async (wow, args, options) => {
  log.cli('LS')
  let addonDir = path.join(wow.wowpath, 'Interface', 'AddOns');
  let stop = false;
  const myAddons = await util.listMyAddonsInFolder(addonDir);
  log.cli('myAddons', myAddons);
  for (let addon of myAddons) {
    let projectName = await util.getUrlNameFromAddon(addon);
    log.cli(projectName);
  }
});

function uninstall(wow, args, options) {
  log.cli('uninstall', 'uninstall cmd')

  if (args.length < 1) {
    // error message
    handleCliError(wow);
    // log.cli('error', 'Should specify addon as argument')
    return
  }

  let addonName = args[0];
  wow.uninstall(addonName, (err) => {
    if (err && err == 'not found') {
      return cli.error(`${addonName} not found`);
    }
    if (err) {
      return cliErrhandler(err);
    }
    cli.ok(`${addonName} uninstalled succesfully`);
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
    return handleCliError(wow);
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
    if (num == 0) {
      return console.log('Nothing to update');
    }
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
            cli.ok('succesfully updated ' + addonName)
          }
        })
      });
    }
  })
}

function platforms(wow, args, options) {
  console.log('Available Platforms: %s', wow.platforms().join(', '));
}


function ls(wow, args, options) {
  wow.getConfigData((err, data) => {
    if (err) {
      return cliErrhandler(err);
    }
    if (!data || !data.addons) {
      return console.log('config file is empty');
    }
    let folders = [];
    Object.keys(data.addons).forEach(function(addon) {
      var addondata = data.addons[addon];
      folders.push({
        label: `[${addondata.platform}:${addon} r${addondata.version}]`,
        nodes: addondata.folders.sort()
      });
    });
    folders.sort();
    console.log(archy({
      label: wow.getAddonsDir(),
      nodes: folders
    }));
  })
}

function blame(wow, args, options) {
  if (args.length != 1) {
    return handleCliError(wow);
  }
  wow.blame(args[0], function(err, addons) {
    if (err) {
      return cliErrhandler(err);
    }
    if (addons.length == 0) {
      return console.log('Unknown folder ' + args[0]);
    }
    console.log('Folder %s is from %s', args[0], addons.join(', '));
  });
}

function version(wow, args, options) {
  cli.ok(`v${wow.version()}`);
}

function reinstall(wow, args, options) {
  wow.getConfigData((err, data) => {
    if (err) {
      return cliErrhandler(err);
    }
    if (!data || !data.addons || Object.keys(data.addons).length == 0) {
      return cli.ok('Nothing to reinstall');
    }
    let addonReinstall = []
    Object.keys(data.addons).forEach((addonName) => {
      addonReinstall.push({
        version: data.addons[addonName].version,
        name: addonName
      })
    })

    util.installAddonList(wow, addonReinstall)
      .then((results) => {
        cli.ok(`Correctly reinstalled ${results.length} addons`);
      }, (err) => {
         cli.error('Error in reinstall addons');
         return cliErrhandler(err);
      }, (progress) => {
        cli.ok('Reinstalled ' + progress);
      })

  })
}

function betterHelp(wow) {
  console.log('wow: World Of Warcraft Addon Manager v%s', wow.version());
  console.log('     Completely unassociated with Blizzard');
  console.log('   ');
  console.log('    platforms: List available addon platforms');
  console.log('  Installing:');
  console.log('    install <addon>: Install an addon');
  console.log('        -p --platform Select the platform of the addon. Defaults to `curse`');
  console.log('        -v --version Install a specific version of the addon.');
  // console.log('           --cache <true/false> Enable or disable the cache. Defaults to true');
  console.log('    checkupdate [addon]: Check if there\'s an update to all addons, or just one');
  console.log('    update [addon]: Updates all addons, or the addon in the first argument.');
  // console.log('        -c --concur How many downloads to run when updating all the addons.');
  // console.log('                    Default: 1. Recommended: 1-4.');
  console.log('    uninstall <addon>: Uninstall a previously installed addon');
  console.log('    reinstall: Forcefully reinstall all addons saved in the config file');
  console.log('  Managing:');
  console.log('    installed: List installed addons');
  console.log('    ls, folders: List addons and their folders');
  console.log('    blame <folder>: Figure out which addon an addon folder is from');
  console.log('  Internals/Automation:');
  console.log('    Do note that many of these will supress all output except for the requested output');
  // console.log('    dlurl <addon>: Get a download URL.');
  // console.log('        -s --source Addon source, see above');
  // console.log('        -v --version Addon version, see above');
  console.log('    ');
  console.log('    wow-cli is licensed under the MIT license');
  console.log('    https://github.com/zekesonxx/wow-cli');
}

manager.setup();
