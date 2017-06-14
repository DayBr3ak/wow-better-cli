const fs = require('fs');
let temp = require('temp');
// if (!global.DEBUG) {
  // temp = temp.track();
// }
const _mkdirp = require('mkdirp');
const ncp = require('ncp');
const _rimraf = require('rimraf');
ncp.limit = 16;

export function writeFile(filepath, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(filepath, data, (err) => {
      if (err)
        return reject(err);
      resolve();
    });
  });
}

export function readFile(filepath, opts={}) {
  return new Promise((resolve, reject) => {
    fs.readFile(filepath, opts, (err, data) => {
      if (err) {
        return reject(err);
      }
      resolve(data);
    });
  });
}

export function readDir(folderpath) {
  return new Promise((resolve, reject) => {
    fs.readdir(folderpath, (err, list) => {
      if (err) {
        return reject(err);
      }
      resolve(list);
    });
  });
}

export function folderStat(path) {
  return new Promise((resolve, reject) => {
    fs.stat(path, (err, stat) => {
      if (err) {
        return reject(err);
      }
      resolve(stat);
    });
  });
}

export function mkTempDir(dirname) {
  return new Promise((resolve, reject) => {
    temp.mkdir(dirname, (err, dirFolder) => {
      if (err) {
        return reject(err);
      }
      resolve(dirFolder);
    });
  });
}

export function tempOpen(pathPrefix) {
  return new Promise((resolve, reject) => {
    temp.open(pathPrefix, (err, info) => {
      if (err) {
        return reject(err);
      }
      resolve(info);
    });
  });
}

export function closeFd(fd) {
  return new Promise((resolve, reject) => {
    fs.close(fd, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

export function exists(filename) {
  return new Promise((resolve, reject) => {
    fs.access(filename, fs.constants.R_OK | fs.constants.W_OK, (err) => {
      if (err) {
        return resolve(false);
      }
      resolve(true);
    });
  });
}

export function mkdirp(dir) {
  return new Promise((resolve, reject) => {
    _mkdirp(dir, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    })
  });
};

export function copyFolder(source, destination) {
  return new Promise((resolve, reject) => {
    ncp(source, destination, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

export function rimraf(folder) {
  return new Promise((resolve, reject) => {
    _rimraf(folder, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}





