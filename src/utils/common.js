
export function promisify(fn, opts={}) {
  return function(...args) {
    return new Promise((resolve, reject) => {
      const tmp = fn(...args, (err, ...results) => {
        if (err) {
          return reject(err);
        }
        if (results.length > 1) {
          return resolve(results);
        }
        return resolve(results[0]);
      });

      if (opts.callback && typeof opts.callback === 'function') {
        opts.callback(tmp, ...args);
      }
    });
  }
}

