const path = require('path');
import { readFile } from './fileutil';

export async function parse (tocfilePath) {
  const content = await readFile(tocfilePath, {encoding: 'utf-8'});
  const lines = content.split('\n');
  const result = {};
  let stop = false;

  for (let line of lines) {
    if (stop) {
      return;
    }
    if (line.startsWith('## ')) {
      // parse line to dict entry
      const subLine = line.substr(3);
      let subLineSplitted = subLine.split(':');

      if (subLineSplitted.length < 2) {
        console.log(content);
        console.log('****')
        console.log(line)
        throw 'Toc parse error';
      }

      subLineSplitted = [subLineSplitted.shift().trim(), subLineSplitted.join(':').trim()];
      result[subLineSplitted[0]] = subLineSplitted[1];
    } else if (line == '') {
      // ignore
    } else {
      stop = true;
    }
  }
  return result;
}
