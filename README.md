# wow-better-cli
This is a fork from zekesonxx wow-cli project. The project is unmaintened so I took over.

This is a World of Warcraft addon downloader, installer, uninstaller, and manager.

I don't play WoW anymore, but this thing still works fine.

## Installation
```text
$ npm install -g wow-better-cli
```
wow-better-cli is, as the name implies, a CLI tool. The tool will keep track of your installed addons in a addons.json file in your AppData folder. The tool works on all platforms. The tool will ask you on first use to enter the directory of your wow installation. If it is in a protected directory (like in Program Files) run it as Administrator.

## Features
Implemented:
* Install addons from Curse, TukUI.org, and WoWInterface
* Uninstall addons
* Update addons
* List installed addons
* Cache of addon zip files for reinstalling and the like
* Folder blame
* Change wow directory
* Reinstall all addons in the addons.json

Planned (in no particular order):
* Install addons from git/svn/hg repos
* Better user interface
* .addons.json backups
* Metadata display
* (far future) GUI
* logcat
* Saved variable messing with


## Usage
```text
$ wow
wow: World Of Warcraft Addon Manager v0.0.4
     Completely unassociated with Blizzard

    sources: List available addon sources
  Installing:
    install <addon-name>: Install an addon
        -s --source Select the source of the addon. Defaults to `curse`
        -v --version Install a specific version of the addon.
           --cache <true/false> Enable or disable the cache. Defaults to true
    checkupdate <addon>: Check if there's an update to an addon
    update [addon]: Updates all addons, or the addon in the first argument.
        -c --concur How many downloads to run when updating all the addons.
                    Default: 1. Recommended: 1-4.
    uninstall <addon-name>: Uninstall a previously installed addon
  Managing:
    installed: List installed addons
    ls, folders: List addons and their folders
    blame <folder>: Figure out which addon an addon folder is from
```
Currently supports Curse, TukUI.org, and WoWInterface addons.

## Legal
Licensed under the MIT license.

**THIS TOOL IS NO WAY AFFILIATED OR APPROVED BY BLIZZARD OR IT'S AFFILIATES.**