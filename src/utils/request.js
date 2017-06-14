
const _request = require('request');

export function request(opts) {
  return new Promise((resolve, reject) => {
    _request(opts, (err, res, data) => {
      if (err) {
        return reject(err);
      }
      resolve([res, data]);
    });
  });
}
