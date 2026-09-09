/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';
const crypto = require('crypto');

// Emitted only by dev builds, never part of a shipped page.
const TEST_BUNDLE = /\/(test|testDependencies)\.bundle(\.|\b)/;

/**
 * Pick which fxa-settings env directory under dist/settings is actually served.
 *
 * @param {String[]} envDirs directory names found under dist/settings
 * @param {String} [envOverride] value of STATIC_SETTINGS_DIRECTORY, if set
 * @param {String} [fallback] used when the directory can't be uniquely resolved
 * @returns {String}
 */
function pickSettingsDirectory(envDirs, envOverride, fallback = 'prod') {
  if (envOverride) {
    return envOverride;
  }
  return envDirs.length === 1 ? envDirs[0] : fallback;
}

/**
 * Whether a built file is actually served to browsers. dist/settings holds one
 * directory per built env; only the served one ships.
 *
 * @param {String} distRelative forward-slash path relative to dist
 * @param {String} settingsDirectory the served fxa-settings env directory
 * @returns {Boolean}
 */
function isServed(distRelative, settingsDirectory) {
  if (TEST_BUNDLE.test('/' + distRelative)) {
    return false;
  }
  if (distRelative.indexOf('settings/') !== 0) {
    return true;
  }

  const withoutPrefix = distRelative.slice('settings/'.length);
  const slash = withoutPrefix.indexOf('/');
  return slash !== -1 && withoutPrefix.slice(0, slash) === settingsDirectory;
}

/**
 * @param {Buffer|String} bytes
 * @returns {String}
 */
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
 * @param {String} args.settingsDirectory served fxa-settings env directory
 * @returns {{ manifest: {hashes: Object, any_hashes: string[]}, count: number }}
 */
function buildManifest({ files, readBytes, settingsDirectory }) {
  // Deduplicate potential shared content.
  const anyHashes = new Set();

  files.forEach((distRelative) => {
    if (isServed(distRelative, settingsDirectory)) {
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
  pickSettingsDirectory,
  isServed,
  sha256Base64,
  buildManifest,
};
