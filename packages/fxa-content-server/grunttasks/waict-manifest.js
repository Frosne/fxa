/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Generate the WAICT integrity manifest from the built artifacts.

'use strict';
const crypto = require('crypto');
const path = require('path');

module.exports = function (grunt) {
  grunt.registerTask(
    'generate-waict-manifest',
    'Generate the WAICT integrity manifest of served script hashes',
    function () {
      const dist = grunt.config.get('yeoman.dist');

      // Hash raw bytes; re-encoding would yield a permanently unmatchable hash.
      const hashes = new Set(
        grunt.file.expand({ cwd: dist }, '**/*.js').map((rel) =>
          crypto
            .createHash('sha256')
            .update(grunt.file.read(path.join(dist, rel), { encoding: null }))
            .digest('base64')
        )
      );

      const dest = path.join(dist, 'waict-manifest.json');
      grunt.file.write(
        dest,
        JSON.stringify({ hashes: {}, any_hashes: [...hashes] }, null, 2)
      );
      grunt.log.writeln(
        'Wrote WAICT manifest: ' + hashes.size + ' hashes -> ' + dest
      );
    }
  );
};
