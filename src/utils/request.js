
const _request = require('request');
const progress = require('progress');

import { promisify } from './common';

function requestProgressBar(req, opts) {
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
}

export const request = promisify(_request, { callback: requestProgressBar });

