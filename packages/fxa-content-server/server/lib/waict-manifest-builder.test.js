/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

const crypto = require('crypto');
const { sha256Base64, buildManifest } = require('./waict-manifest-builder');

describe('sha256Base64', () => {
  it('matches a known SHA-256 base64 digest', () => {
    const bytes = Buffer.from('hello');
    const expected = crypto
      .createHash('sha256')
      .update(bytes)
      .digest('base64');
    expect(sha256Base64(bytes)).toBe(expected);
  });
});

describe('buildManifest', () => {
  const readBytes = (rel) => Buffer.from('bytes-of:' + rel);
  const hashOf = (rel) => sha256Base64(readBytes(rel));

  it('content-addresses every script in any_hashes', () => {
    const { manifest, count } = buildManifest({
      files: ['bundle/app.bundle.js', 'settings/prod/static/js/main.js'],
      readBytes,
    });

    expect(count).toBe(2);
    expect(manifest.hashes).toEqual({});
    expect(manifest.any_hashes.sort()).toEqual(
      [
        hashOf('bundle/app.bundle.js'),
        hashOf('settings/prod/static/js/main.js'),
      ].sort()
    );
  });

  it('excludes test/testDependencies bundles', () => {
    const { manifest, count } = buildManifest({
      files: [
        'bundle/app.bundle.js',
        'bundle/test.bundle.js',
        'bundle/testDependencies.bundle.js',
      ],
      readBytes,
    });

    expect(count).toBe(1);
    expect(manifest.any_hashes).toEqual([hashOf('bundle/app.bundle.js')]);
  });

  it('de-duplicates identical content', () => {
    const { manifest, count } = buildManifest({
      files: ['bundle/a.js', 'bundle/b.js'],
      readBytes: () => Buffer.from('same-bytes'),
    });

    expect(count).toBe(1);
    expect(manifest.any_hashes).toEqual([sha256Base64('same-bytes')]);
  });
});
