/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Generate the WAICT integrity manifest from the built artifacts.

'use strict';
const path = require('path');
const { buildManifest } = require('../server/lib/waict-manifest-builder');

module.exports = function (grunt) {
  grunt.registerTask(
    'generate-waict-manifest',
    'Generate the WAICT integrity manifest of served script hashes',
    function () {
      const dist = grunt.config.get('yeoman.dist');

      const { manifest, count } = buildManifest({
        files: grunt.file.expand({ cwd: dist }, '**/*.js'),
        readBytes: (rel) =>
          grunt.file.read(path.join(dist, rel), { encoding: null }),
      });

      const dest = path.join(dist, 'waict-manifest.json');
      grunt.file.write(dest, JSON.stringify(manifest, null, 2));
      grunt.log.writeln(
        'Wrote WAICT manifest: ' + count + ' hashes -> ' + dest
      );
    }
  );
};
