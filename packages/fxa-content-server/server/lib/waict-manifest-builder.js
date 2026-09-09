/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';
const crypto = require('crypto');

// Emitted only by dev builds, never part of a shipped page.
const TEST_BUNDLE = /\/(test|testDependencies)\.bundle(\.|\b)/;

function sha256Base64(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('base64');
}

/**
 * Build the WAICT manifest from an abstract file list.
 *
 * Scripts are content-addressed in `any_hashes` rather than pinned to a URL in
 * `hashes`: content-server's own scripts are referenced through the
 * runtime-interpolated `staticResourceUrl`, and fxa-settings' are served from a
 * CDN in stage/prod, so neither URL is knowable at build time.
 *
 * @param {Object} args
 * @param {String[]} args.files dist-relative forward-slash paths
 * @param {(distRelative: string) => (Buffer|string)} args.readBytes
 * @returns {{ manifest: {hashes: Object, any_hashes: string[]}, count: number }}
 */
function buildManifest({ files, readBytes }) {
  // Deduplicate potential shared content.
  const anyHashes = new Set();

  files.forEach((distRelative) => {
    if (!TEST_BUNDLE.test('/' + distRelative)) {
      anyHashes.add(sha256Base64(readBytes(distRelative)));
    }
  });

  return {
    manifest: { hashes: {}, any_hashes: Array.from(anyHashes) },
    count: anyHashes.size,
  };
}

module.exports = {
  TEST_BUNDLE,
  sha256Base64,
  buildManifest,
};
