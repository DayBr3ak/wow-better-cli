# wow-better-cli

[![Dependency Status](https://david-dm.org/daybr3ak/wow-better-cli.svg)](https://david-dm.org/daybr3ak/wow-better-cli)
[![Build status](https://ci.appveyor.com/api/projects/status/80n7g3005oy2csnw?svg=true)](https://ci.appveyor.com/project/DayBr3ak/wow-better-cli)

This is a fork from zekesonxx wow-cli project. The project is unmaintened so I took over.

This is a World of Warcraft addon downloader, installer, uninstaller, and manager.

## Installation
```text
$ npm install -g wow-better-cli
```
wow-better-cli is, as the name implies, a CLI tool. The tool will keep track of your installed addons in a addons.json file in your AppData folder. The tool works on all platforms. The tool will ask you on first use to enter the directory of your wow installation. If it is in a protected directory (like in Program Files) run it as Administrator.

## Features
Implemented:
* Install addons from Curse, TukUI.org, WoWInterface and Git
* Uninstall addons
* Update addons
* List installed addons
<!-- * Cache of addon zip files for reinstalling and the like -->
* Folder blame
* Change wow directory
* Reinstall all addons in the addons.json

<!-- Planned (in no particular order): -->
<!-- * Install addons from git/svn/hg repos -->
<!-- * Better user interface -->
<!-- * .addons.json backups -->
<!-- * Metadata display -->
<!-- * (far future) GUI -->
<!-- * logcat -->
<!-- * Saved variable messing with -->


## Usage
```text
$ wow
wow: World Of Warcraft Addon Manager v0.0.4
     Completely unassociated with Blizzard

    sources: List available addon sources
  Installing:
    install <addon-name>: Install an addon
        -p --platform Select the source of the addon. Defaults to `curse`
        -v --version Install a specific version of the addon.
    checkupdate <addon>: Check if there's an update to an addon
    update [addon]: Updates all addons, or the addon in the first argument.
    uninstall <addon-name>: Uninstall a previously installed addon
  Managing:
    installed: List installed addons
    ls: List addons and their folders
    blame <folder>: Figure out which addon an addon folder is from
```
Currently supports Curse, TukUI.org, WoWInterface and Git addons.

## Legal
Licensed under the MIT license.

**THIS TOOL IS NO WAY AFFILIATED OR APPROVED BY BLIZZARD OR IT'S AFFILIATES.**
