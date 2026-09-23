/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Generate the WAICT integrity manifest from the built artifacts, e.g.:
//
//   {
//     "hashes": {
//       "{{{ staticResourceUrl }}}/bundle-782f1cdb63/app.bundle.js": "<sha256>",
//       "https://cdn.accounts.firefox.com/settings/prod/static/js/main.1a2b.js": "<sha256>"
//     },
//     AW: here it goes the scripts I don't know how to compute the path 
//     "any_hashes": ["<sha256>"]
//   }
//
// Scripts fall into three groups:
// 1. Content-server scripts. Their URL prefix comes from runtime config
//    (`{{{ staticResourceUrl }}}`); the manifest route replaces it when
//    serving, e.g.:
//      {{{ staticResourceUrl }}}/bundle-782f1cdb63/app.bundle.js
//      -> https://accounts-static.cdn.mozilla.net/bundle-782f1cdb63/app.bundle.js
//    AW: keep in mind that if we run the manifest generation task,
//    the generated manifest WILL contain this staticResourceURL placeholder
//    it will be replaced in the route's process function
//    See test: 'replaces every static resource URL placeholder'
// 2. fxa-settings scripts listed in its asset-manifest.json. Their full URL
//    is fixed when fxa-settings is built, e.g.:
//      settings/prod/static/js/main.1a2b.js
//      -> https://cdn.accounts.firefox.com/settings/prod/static/js/main.1a2b.js
// 3. Any other script, e.g. fxa-settings' lang-fix.js, which is loaded as
//    lang-fix.js?v=<hash>. Firefox matches `hashes` keys against the full
//    URL, query included, so these go in `any_hashes` (matched by content
//    only).
//    TODO: AW: maybe we can be cleverer here but Idk how.

'use strict';
const crypto = require('crypto');
const path = require('path');
const { STATIC_RESOURCE_URL_PLACEHOLDER } = require('../server/lib/waict');

const SETTINGS_PREFIX = 'settings/';

module.exports = function (grunt) {
  // Maps dist-relative settings scripts to the URL in their asset-manifest.json.
  // Look at group 2 above
  function settingsUrls(dist) {
    const urls = {};
    grunt.file
      .expand({ cwd: dist }, SETTINGS_PREFIX + '*/asset-manifest.json')
      .forEach((rel) => {
        const envDir = path.posix.dirname(rel);
        const assetUrls = Object.values(
          grunt.file.readJSON(path.join(dist, rel)).files
        );
        grunt.file
          .expand({ cwd: path.join(dist, envDir) }, '**/*.js')
          .forEach((file) => {
            const url = assetUrls.find((u) => u.endsWith('/' + file));
            if (url) {
              urls[envDir + '/' + file] = url;
            }
          });
      });
    return urls;
  }

  grunt.registerTask(
    'generate-waict-manifest',
    'Generate the WAICT integrity manifest of served script hashes',
    function () {
      // see grunttasks/yeoman.js:12
      const dist = grunt.config.get('yeoman.dist');
      const urls = settingsUrls(dist);
      const hashes = {};
      const anyHashes = new Set();

      grunt.file.expand({ cwd: dist }, '**/*.js').forEach((rel) => {
        const hash = crypto
          .createHash('sha256')
          .update(grunt.file.read(path.join(dist, rel), { encoding: null }))
          .digest('base64');

        if (!rel.startsWith(SETTINGS_PREFIX)) {
          hashes[STATIC_RESOURCE_URL_PLACEHOLDER + '/' + rel] = hash;
        } else if (urls[rel]) {
          hashes[urls[rel]] = hash;
        } else {
          grunt.log.writeln('WAICT: no URL for ' + rel + ', using any_hashes');
          anyHashes.add(hash);
        }
      });

      const dest = path.join(dist, 'waict-manifest.json');
      // Targets the Gecko WAICT prototype (Firefox 150+),
      // which parses the response body as bare JSON.
      grunt.file.write(
        dest,
        JSON.stringify({ hashes, any_hashes: [...anyHashes] }, null, 2)
      );
      grunt.log.writeln(
        'Wrote WAICT manifest: ' +
          Object.keys(hashes).length +
          ' hashes, ' +
          anyHashes.size +
          ' any_hashes -> ' +
          dest
      );
    }
  );
};
