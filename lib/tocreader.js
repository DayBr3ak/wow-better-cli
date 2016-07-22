// tocreader.js

const fs = require('fs');
const path = require('path');

function parse (tocfilePath) {
  // console.log(splited)

  let content;
  try {
    content = fs.readFileSync(tocfilePath, {encoding: 'utf-8'});
    // console.log(content)
  } catch (e) {
    return null;
  }

  let stop = false;
  let lines = content.split('\n');
  let result = {}
  lines.forEach((line) => {
    if (stop)
      return
    if (line.startsWith('## ')) {
      // parse line to dict entry
      let subLine = line.substr(3);
      let subLineSplitted = subLine.split(':');

      if (subLineSplitted.length < 2) {
        console.log(content);
        console.log('****')
        console.log(line)
        throw 'Toc parse error'
      }

      subLineSplitted = [subLineSplitted.shift().trim(), subLineSplitted.join(':').trim()]
      // console.log(subLineSplitted)

      result[subLineSplitted[0]] = subLineSplitted[1];

    } else if (line == '') {
      // ignore
    } else {
      stop = true;
    }
  })
  return result;
}

exports.parse = parse;