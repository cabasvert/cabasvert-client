/**
 * This file is part of CabasVert.
 *
 * Copyright 2017, 2018 Didier Villevalois
 *
 * CabasVert is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * CabasVert is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with CabasVert.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * This file rewrites node_modules/@angular-devkit/build-angular to enable crypto-browserify.
 * It must be called by npm after install. Make sure that your package.json includes:
 * {
 *   "scripts": {
 *     "postinstall": "node patch.js"
 *   }
 * }
 */

const fs = require('fs');
const VERSION_FILE = 'src/version.ts';
const ANDROID_VERSION_FILE = 'android/version.properties';

const version = process.env.npm_package_version;

writeFile(VERSION_FILE, `
// This file is generated by bin/set-versions.js
export const APP_VERSION = '${version}';
`);

writeFile(ANDROID_VERSION_FILE, `
## This file is generated by bin/set-versions.js
versionCode=${buildAndroidVersionCode(version).toString()}
versionName=${version}
`);

function buildAndroidVersionCode(version) {
  // 100 major, 100 minor, 99 patch
  // 40 alpha, 40 beta, 20 rc

  var splitVersion = version.split(new RegExp('\\.|-'));

  var major = parseInt(splitVersion[0], 10);
  var minor = parseInt(splitVersion[1], 10);
  var patch = parseInt(splitVersion[2], 10);

  var versionCode = major * 1000000 + minor * 10000 + patch * 100;

  if (splitVersion.length !== 3) {
    var isBeta = splitVersion[3] === 'beta';
    var isRC = splitVersion[3] === 'rc';
    var build = splitVersion[4] ? parseInt(splitVersion[4], 10) : 0;

    versionCode = (versionCode - 100) + build + (isBeta ? 40 : 0) + (isRC ? 20 : 0);
  }

  return versionCode
}

function writeFile(name, content) {
  fs.writeFile(name, content, 'utf8', function (err) {
    if (err) return console.log(err);
  });
}
