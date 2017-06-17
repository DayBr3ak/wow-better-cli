
const _request = require('request');
const progress = require('progress');


export function request(opts) {
  return new Promise((resolve, reject) => {
    const req = _request(opts, (err, res, data) => {
      console.log('');
      if (err) {
        return reject(err);
      }
      resolve([res, data]);
    });

    if (opts.progressbar && opts.progressbar === true) {
      let bar;
      req.on('data', (chunk) => {
        bar.tick(chunk.length);
      })
      .on('response', (resp) => {
        const len = parseInt(resp.headers['content-length'], 10);
        bar = new progress('  downloading [:bar] :rate/bps :percent :etas', {
          complete: '=',
          incomplete: ' ',
          width: 20,
          total: len
        });
      })
    }
  });
}
