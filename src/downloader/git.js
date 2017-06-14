
const log = require('npmlog');


const path = require('path');
const cheerio = require('cheerio');

log.addLevel('git', 3000, { fg: 'yellow' });
const loglvl = 'git'

import { getGitName, copyFoldersTo } from '../utils/util';
import { readDir, mkTempDir } from '../utils/fileutil';
import { request } from '../utils/request';

let Git = null;
try {
  Git = require('nodegit');
} catch(err) {
  log.error('git', 'package nodegit is not available');
}

export class GitAddon {
  constructor() {

  }

  scrapAddonVersion(body) {
    let $ = cheerio.load(body);
    let lastCommit = $('.last-commit').first();
    let a = $('a', lastCommit);
    let commit = a.attr('href').split('/')
    commit = commit[commit.length - 1];
    log.log(loglvl, commit);
    return commit;
  }

  async getDownloadURL(slug, version) {
    if (Git === null) {
      throw "Can't use nodegit because binaries aren't available";
    }
    const re = /git\.tukui\.org/;
    if (re.exec(slug)) {
      const url = slug.split('.git')[0] + '/tree/master';
      log.http('GET', url);
      const [res, body] = await request({ url: url });
      const version = this.scrapAddonVersion(body);
      if (!version) {
        throw 'git :: version scrapped is null';
      }
      return [slug, version];
    } else {
      const folder = await mkTempDir('git');
      const repo = await Git.Clone(slug, folder);
      const commit = await repo.getMasterCommit();
      return [slug, commit.sha()];
    }
  }

  async install(url, addonsDir) {
    if (Git === null) {
      throw "Can't use nodegit because binaries aren't available";
    }
    const gitName = getGitName(url);
    log.log(loglvl, 'git.install', 'git name: ' + gitName);
    const folder = await mkTempDir('git');
    log.log(loglvl, 'git.install.0', 'begin clone ' + gitName + ' into tmp folder');
    const repo = await Git.Clone(url, folder);
    log.log(loglvl, 'git.install.1', 'cloned ' + gitName + ' into tmp folder');
    const commit = await repo.getMasterCommit();
    let version = commit.sha();
    log.log(loglvl, 'git.install.2', 'cloned ' + gitName + ' into tmp folder');

    let list = await readDir(folder);
    log.log(loglvl, 'git.install', 'examining repo ' + gitName);
    list = this.filterGit(list);

    let foundToc = false;
    const listPathJoined = [];
    for (let entry of list) {
      listPathJoined.push(path.join(folder, entry));
      log.log(loglvl, 'entry', entry);
      if (path.extname(entry) == '.toc') {
        foundToc = true;
        log.log(loglvl, 'tocfile found');
      }
    }

    let dest;
    if (foundToc) {
      log.log(loglvl, 'git.install', 'copying root folder');
      tmpFolders = [repoFolder];
      dest = path.join(addonsDir, gitName);
    } else {
      tmpFolders = listPathJoined;
      dest = addonsDir
    }

    await copyFoldersTo(tmpFolders, dest);
    log.log(loglvl, 'git.install', 'tpmFolder: ' + tmpFolders.join(', '))
    if (foundToc) {
      folders = [gitName];
    } else {
      folders = this.filterGit(list);
    }

    if (version && folders) {
      return {
        platform: 'git',
        version: version,
        folders: folders
      }
    }

    // return commit.getTree();
  }

  filterGit(folderList) {
    return folderList.filter(f => path.basename(f) !== '.git');
  }
}

