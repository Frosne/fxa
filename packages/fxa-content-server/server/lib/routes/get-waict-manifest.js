/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Serves the manifest written by the `generate-waict-manifest` grunt task.

'use strict';
const fs = require('fs');
const path = require('path');
const logger = require('../logging/log')();

// Required by the WAICT spec; Firefox does not enforce it yet (bug 2025255).
const MANIFEST_CONTENT_TYPE = 'application/waict-integrity-manifest';

module.exports = function (config) {
  const manifestFile = path.join(
    __dirname,
    '../../..',
    config.get('static_directory'),
    'waict-manifest.json'
  );

  return {
    method: 'get',
    path: config.get('waict.manifestPath'),
    process: function (req, res) {
      fs.readFile(manifestFile, (err, body) => {
        if (err) {
          // Report mode is non-blocking, so a missing manifest is not fatal.
          logger.warn('waict.manifest.missing', { path: manifestFile });
          res.status(404).end();
          return;
        }

        // Revalidate always; a stale manifest reports as a false violation.
        res.setHeader('Cache-Control', 'no-cache');
        res.type(MANIFEST_CONTENT_TYPE);
        res.send(body);
      });
    },
  };
};
