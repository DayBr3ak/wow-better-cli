// git.js
'use strict';

const log = require('npmlog');
const Git = require('nodegit');
const temp = require('temp');
const path = require('path');
const fs = require('fs');

const util = require('../util');

exports.getDownloadURL = function (slug, version, cb) {
  cb(null, slug);
}

exports.install = function(url, addonsDir, cb) {
  let gitName = util.getGitName(url);
  log.info('git.install', 'git name: ' + gitName)

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
      if (err) {
        return cb(err);
      }
      let foundToc = false;
      let listPathJoined = [];
      list = filterGit(list);
      list.forEach((entry) => {
        listPathJoined.push(path.join(repoFolder, entry));
        log.info('entry', entry);
        if (path.extname(entry) == '.toc') {
          foundToc = true;
          log.info('tocfile found');
        }
      })
      let dest;
      if (foundToc) {
        log.info('git.install', 'copying root folder');
        tmpFolders = [repoFolder];
        dest = path.join(addonsDir, gitName);
      } else {
        tmpFolders = listPathJoined;
        dest = addonsDir
      }
      util.copyFoldersTo(tmpFolders, dest, (err) => {
        log.info('git.install', 'tpmFolder: ' + tmpFolders.join(', '))

        if (foundToc) {
          folders = [gitName]
        } else {
          folders = filterGit(list);
        }
        update();
      });
    })
  }

  temp.mkdir('git', (err, folder) => {
    if (err) {
      return cb(err);
    }

    Git.Clone(url, folder)
     .then((repo) => {
        examineRepo(folder);
        return repo.getMasterCommit();
     })
     .then((commit) => {
        version = commit.sha();
        update();
        return commit.getTree();
     })
     .catch((err) => {
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
