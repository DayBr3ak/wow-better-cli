// git.js
'use strict';

const log = require('npmlog');
const Git = require('nodegit');
const temp = require('temp');
const path = require('path');
const fs = require('fs');
const request = require('request');
const cheerio = require('cheerio');

log.addLevel('git', 3000, { fg: 'yellow' });
const loglvl = 'git'

const util = require('../util');

function scrapAddonVersion (body) {
  let $ = cheerio.load(body);
  let lastCommit = $('.last-commit').first();
  let a = $('a', lastCommit);
  let commit = a.attr('href').split('/')
  commit = commit[commit.length - 1];
  log.log(loglvl, commit);
  return commit;
}

exports.getDownloadURL = function (slug, version, cb) {
  const re = /git\.tukui\.org/;
  if (re.exec(slug)) {
    let url = slug.split('.git')[0] + '/tree/master';
    log.http('GET', url);
    return request.get(url, (err, res, body) => {
      if (err) {
        return cb(err);
      }
      try {
        let version = scrapAddonVersion(body);
        if (!version)
          throw 'Version is null';
        return cb(null, slug, version);
      } catch (e) {
        return cb(err)
      }
    })
  } else {
    temp.mkdir('git', (err, folder) => {
      if (err) {
        return cb(err);
      }

      Git.Clone(slug, folder)
       .then((repo) => {
          return repo.getMasterCommit();
       })
       .then((commit) => {
          cb(null, slug, commit.sha());
       })
       .catch((err) => {
          cb(err);
       })
    });
  }
}

exports.install = function(url, addonsDir, cb) {
  let gitName = util.getGitName(url);
  log.log(loglvl, 'git.install', 'git name: ' + gitName)

  let version = null;
  let folders = null;
  let tmpFolders = null;
  let update = () => {
    if (version && folders) {
      cb(null, {
        platform: 'git',
        version: version,
        folders: folders
      })
    }
  }

  let examineRepo = (repoFolder) => {
    fs.readdir(repoFolder, (err, list) => {
      log.log(loglvl, 'git.install', 'examining repo ' + gitName)
      if (err) {
        return cb(err);
      }
      let foundToc = false;
      let listPathJoined = [];
      list = filterGit(list);
      list.forEach((entry) => {
        listPathJoined.push(path.join(repoFolder, entry));
        log.log(loglvl, 'entry', entry);
        if (path.extname(entry) == '.toc') {
          foundToc = true;
          log.log(loglvl, 'tocfile found');
        }
      })
      let dest;
      if (foundToc) {
        log.log(loglvl, 'git.install', 'copying root folder');
        tmpFolders = [repoFolder];
        dest = path.join(addonsDir, gitName);
      } else {
        tmpFolders = listPathJoined;
        dest = addonsDir
      }
      // copy tmp folders to your actual addon directory
      util.copyFoldersTo(tmpFolders, dest)
        .then(() => {
          log.log(loglvl, 'git.install', 'tpmFolder: ' + tmpFolders.join(', '))

          if (foundToc) {
            folders = [gitName]
          } else {
            folders = filterGit(list);
          }
          update();
        }, (err) => {
          cb(err);
        });
    })
  }

  temp.mkdir('git', (err, folder) => {
    if (err) {
      return cb(err);
    }

    log.log(loglvl, 'git.install.0', 'begin clone ' + gitName + ' into tmp folder')
    Git.Clone(url, folder)
     .then((repo) => {
        log.log(loglvl, 'git.install.1', 'cloned ' + gitName + ' into tmp folder')
        return repo.getMasterCommit();
     }, (err) => {
      cb(err);
     })
     .then((commit) => {
        version = commit.sha();
        log.log(loglvl, 'git.install.2', 'cloned ' + gitName + ' into tmp folder')
        examineRepo(folder);
        return commit.getTree();
     }, (err) => {
      cb(err);
     })
  })
}

function filterGit(folderList) {
  let filtered = [];
  folderList.forEach((f) => {
    if (path.basename(f) != '.git') {
      filtered.push(f);
    }
  })
  return filtered;
}
