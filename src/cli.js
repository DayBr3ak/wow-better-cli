import "babel-polyfill";

if (global.DEBUG === undefined) {
  global.DEBUG = true;
}

const log = require('npmlog');
const path = require('path');
const cli = require('cli');
const archy = require('archy');
const readline = require('readline');

import { Save } from './save';
import { Wow } from './wow';
import * as util from './utils/util';

log.addLevel('cli', 3000, { fg: 'cyan' }, 'CLI');

const DEFAULT_PLATFORM = 'curse';
const DEFAULTS_WOWDIR = {
  '1': path.join('C:', 'Program Files', 'World Of Warcraft'),
  '2': path.join('C:', 'Program Files (x86)', 'World Of Warcraft'),
  '3': path.join('C:', 'World Of Warcraft'),
  '4': path.join('D:', 'World Of Warcraft')
}
const DEFAULTS_WOWDIR_OTHER = Object.keys(DEFAULTS_WOWDIR).length + 1;

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
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    const question = (q) => new Promise(r => rl.question(q, r)); // one liner for await syntax

    console.log('Where is your World of Warcraft folder ?');
    for (let n of Object.keys(DEFAULTS_WOWDIR)) {
      console.log(`  ${n}. ${DEFAULTS_WOWDIR[n]}`);
    }
    console.log(`  ${DEFAULTS_WOWDIR_OTHER}. Other`)

    const answer = await question('');
    const parsedAnswer = parseInt(answer);
    if (isNaN(parsedAnswer) || parsedAnswer < 1 || parsedAnswer > DEFAULTS_WOWDIR_OTHER) {
      rl.close();
      throw {code: 'ARGS_ERROR', message: "Choose one of the options available."};
    }
    let wowdir = null;

    if (parsedAnswer === DEFAULTS_WOWDIR_OTHER) {
      const askedPath = await question('Enter the path:  ');
      log.cli('wowdir answer', 'should be in ' + askedPath);
      wowdir = askedPath;
    } else {
      wowdir = DEFAULTS_WOWDIR[answer];
    }
    wowdir = path.normalize(wowdir);

    console.log('Your World Of Warcraft directory has been saved as');
    console.log(`"${wowdir}"`);

    const isValid = (await question("Is it correct? [Y/n]: ")).toLowerCase();
    rl.close();

    if (isValid !== '' && isValid !== 'y') {
      // recursion
      wowdir = await this.promptWowDir(configFile, data);
    } else {
      if (!wowdir) {
        throw {code: 'WRONG_WOWDIR', message: 'error wrong directory specified'};
      }
      data.wowdir = wowdir;
      await configFile.write(data);
      cli.ok(`Your Wow directory is now "${wowdir}"`);
    }
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
  if (err.code === 'ADDON_NOT_FOUND') {
    return cli.error('AddonNotFound: ' + err.message);
  }
  if (err.code === 'WRONG_WOWDIR') {
    return cli.error('WrongWowDirectory: ' + err.message);
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
    // the user didn't enter any args, try reinstalling what's in the config file.
    const data = await wow.getConfigData();
    if (!data || !data.addons || Object.keys(data.addons).length == 0) {
      return cli.ok('Nothing to install in your config file.');
    }
    let addonReinstall = []
    for (let addonName of Object.keys(data.addons)) {
      addonReinstall.push({
        platform: data.addons[addonName].platform,
        version: data.addons[addonName].version,
        name: addonName
      });
    }

    const results = await wow.installAddonList(addonReinstall);
    cli.ok(`Correctly installed ${results.length} addons`);
    return;
  }
  const addons = args;
  const platform = options.platform;
  const version = options.version ? options.version : null;
  const results = await wow.installAddonList(addons);
  for (let r of results) {
    cli.ok('Installed ' + r);
  }
});

manager.add('info', async (wow) => {
  cli.ok(`Your Wow directory is: "${wow.getDirectory()}"`);
});

manager.add('changewow', async (wow, args, options) => {
  const data = await wow.getConfigData();
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

manager.add('uninstall', async (wow, args, options) => {
  log.cli('uninstall', 'uninstall cmd')
  if (args.length < 1) {
    throw {code: 'ARGS_ERROR', message: 'need at least one addon to uninstall'};
  }

  const uninstaller = async (addon) => {
    await wow.uninstall(addon);
    cli.ok(`${addon} uninstalled succesfully`);
  }
  const awaits = [];
  for (let addon of args) {
    awaits.push(uninstaller(addon));
  }
  await Promise.all(awaits);
});

manager.add('installed', async (wow, args, options) => {
  log.cli('listInstalledAddons');
  const data = await wow.getConfigData();
  if (data && data.addons) {
    let names = Object.keys(data.addons);
    console.log(names.length + ' addon' + (names.length !== 1 ? 's' : '') + ' installed');
    names.forEach(function(addon) {
      console.log('- '+addon);
    });
  }
});

manager.add('checkupdate', async (wow, args, options) => {
  log.cli('checkupdate');
  if (args.length > 1) {
    throw {code: 'ARGS_ERROR', message: 'need 0 or 1 args'};
  }

  if (args.length == 1) {
    let addonName = args[0];

    const [hasUpdate, platform, zipUrl, version] = await wow.checkupdate(addonName);
    if (hasUpdate) {
       console.log('Update Available! Install using $ wow install %s', addonName);
    } else {
      console.log('No updated version found');
    }
  } else {
    const updatesAvailable = await wow.checkAllAddonsForUpdate();
    let num = updatesAvailable.length
    if (num == 0) {
      return console.log('Nothing to update');
    }
    console.log('%s addon%s updates: %s', num, (num !== 1 ? 's have' : ' has'), updatesAvailable.join(', '));
  }
});

manager.add('update', async (wow, args, options) => {
  if (args.length == 1) {
    // one addon
    let addonName = args[0];
    const hasUpdate = await wow.update(addonName);
    if (!hasUpdate) {
      console.log('No update available for ' + addonName);
    } else {
      console.log('succesfully updated ' + addonName)
    }
    return;
  }

  const data = await wow.getConfigData();
  const updater = async (addonName) => {
    const hasUpdate = await wow.update(addonName);
    if (!hasUpdate) {
      // console.log('No update available for ' + addonName);
    } else {
      cli.ok('succesfully updated ' + addonName)
    }
  };

  const awaits = [];
  if (data && data.addons) {
    for (let addonName of Object.keys(data.addons)) {
      awaits.push(updater(addonName));
    }
  }
  if (awaits.length === 0) {
    console.log('0 addons are installed, nothing to update.');
  }
  await Promise.all(awaits);
});

manager.add('platforms', async (wow, args, options) => {
  console.log('Available Platforms: %s', wow.platforms().join(', '));
});


manager.add('ls', async (wow, args, options) => {
  const data = await wow.getConfigData();
  if (!data || !data.addons) {
    return console.log('config file is empty');
  }
  let folders = [];
  for (let addon of Object.keys(data.addons)) {
    const addondata = data.addons[addon];
    folders.push({
      label: `[${addondata.platform}:${addon}, version:${addondata.version}]`,
      nodes: addondata.folders.sort()
    });
  }
  folders.sort();
  console.log(archy({
    label: wow.getAddonsDir(),
    nodes: folders
  }));
});

manager.add('blame', async (wow, args, options) => {
  if (args.length !== 1) {
    throw {code: 'ARGS_ERROR', message: 'Need exactly one argument.'};
  }
  const addons = await wow.blame(args[0]);
  if (addons.length === 0) {
    return console.log('Unknown folder ' + args[0]);
  }
  console.log('Folder %s is from %s', args[0], addons.join(', '));
});

manager.add('version', async (wow, args, options) => {
  cli.ok(`v${wow.version()}`);
});

// manager.add('reinstall', async (wow, args, options) => {
//   const data = await wow.getConfigData();
//   if (!data || !data.addons || Object.keys(data.addons).length == 0) {
//     return cli.ok('Nothing to reinstall');
//   }
//   let addonReinstall = []
//   for (let addonName of Object.keys(data.addons)) {
//     addonReinstall.push({
//       version: data.addons[addonName].version,
//       name: addonName
//     });
//   }

//   const results = await wow.installAddonList(addonReinstall);
//   cli.ok(`Correctly reinstalled ${results.length} addons`);
// });

manager.add('help', async (wow) => {
  betterHelp(wow);
});

function betterHelp(wow) {
  console.log('wow: World Of Warcraft Addon Manager v%s', wow.version());
  console.log('     Completely unassociated with Blizzard');
  console.log('   ');
  console.log('    platforms: List available addon platforms');
  console.log('    help: Display this message');
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
  console.log('    info : Remind you of your wow folder');
  console.log('    changewow [folder]: Change wow folder');
  console.log('    ls: List addons and their folders');
  console.log('    blame <folder>: Figure out which addon an addon folder is from');
  // console.log('  Internals/Automation:');
  // console.log('    Do note that many of these will supress all output except for the requested output');
  // console.log('    dlurl <addon>: Get a download URL.');
  // console.log('        -s --source Addon source, see above');
  // console.log('        -v --version Addon version, see above');
  console.log('    ');
  console.log('    wow-cli is licensed under the MIT license');
  console.log('    https://github.com/DayBr3ak/wow-better-cli');
}

manager.setup();
