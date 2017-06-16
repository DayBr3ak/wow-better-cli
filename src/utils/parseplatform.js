
const cursePrefixRegex = /curse:([A-Za-z0-9-_]+)$/;
const curseUrlRegex = /(?:(?:https:\/\/)?www\.)?mods\.curse\.com\/addons\/wow\/([A-Za-z0-9-_]+)$/;

const tukuiRegex = /tukui:([0-9]+)$/;
const tukuiRegex2 = /(?:tukui:)?(elvui|tukui)$/;
const tukuiUrlRegex = /(?:(?:http:\/\/)?www\.)?tukui\.org\/addons\/index\.php\?act=view\&id=([0-9]+)$/;

const wowiRegex = /(?:(?:http:\/\/)?www\.)?wowinterface\.com\/downloads\/info([0-9]+)\-([A-Za-z0-9-_]+)(?:\.html)?$/;
const wowiRegex2 = /wowinterface:([A-Za-z0-9-_]+)\-([0-9]+)$/;
// const gitRegex = /.*\/([A-Za-z0-9-_])\.git$/
export const gitRegex = /(?:\w+:\/\/)(?:.+@)*(?:[\w\d\.]+)(?::[\d]+){0,1}\/*(.*)\.git$/;

const tukuiUI_git = {
  'tukui': 'http://git.tukui.org/Tukz/tukui.git',
  'elvui': 'http://git.tukui.org/Elv/elvui.git'
};

function parseGit(input) {
  let gitValid = gitRegex.exec(input);
  if (gitValid && gitValid[1]) {
    return  {
      platform: 'git',
      addon: input
    }
  }

  let tkValid2 = tukuiRegex2.exec(input);
  if (tkValid2 && tkValid2[1]) {
    return {
      platform: 'git',
      addon: tukuiUI_git[ tkValid2[1] ]
    }
  }
}

function parseTukui(input) {
  let valid = tukuiRegex.exec(input);
  if (valid && valid[1]) {
    return {
      platform: 'tukui',
      addon: valid[1]
    }
  }

  valid = tukuiUrlRegex.exec(input);
  if (valid && valid[1]) {
    return {
      platform: 'tukui',
      addon: valid[1]
    }
  }
}

function parseWowinterface(input) {
  let wowiValid2 = wowiRegex2.exec(input);
  // console.log(wowiValid2);
  if (wowiValid2 && wowiValid2[1] && wowiValid2[2]) {
    return {
      platform: 'wowinterface',
      addon: wowiValid2[1] + '-' + wowiValid2[2]
    }
  }

  const wowinterfaceValidator = wowiRegex.exec(input);
  //if result found && result is number
  if (wowinterfaceValidator && wowinterfaceValidator[1] && String(parseInt(wowinterfaceValidator[1])) === wowinterfaceValidator[1]) {
    const id = parseInt(wowinterfaceValidator[1]);
    const addon = wowinterfaceValidator[2];

    return {
      platform: 'wowinterface',
      addon: addon + '-' + id
    }
  }
}

function parseCurseUrl(input) {
  let valid = cursePrefixRegex.exec(input);
  if (valid && valid[1]) {
    const addon = valid[1];
    return {
      platform: 'curse',
      addon: addon
    }
  }

  valid = curseUrlRegex.exec(input);
  if (valid && valid[1]) {
    const addon = valid[1];
    return {
      platform: 'curse',
      addon: addon
    }
  }
}

export function parsePlatform(input) {

  const parsers = [
    parseGit,
    parseTukui,
    parseWowinterface,
    parseCurseUrl
  ];

  const results = [];
  for (let parser of parsers) {
    const result = parser(input);
    if (result !== undefined) {
      results.push(result);
    }
  }

  if (results.length > 1) {
    throw {code: "PLATFORM_PARSE", message: "Got multiple results from parsing function.", data: [input, results]};
  }
  if (results.length === 0) {
    return {
      platform: 'curse',
      addon: input
    }
  }
  return results[0];
}







