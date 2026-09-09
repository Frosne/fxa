/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

const crypto = require('crypto');
const {
  pickSettingsDirectory,
  isServed,
  sha256Base64,
  buildManifest,
} = require('./waict-manifest-builder');

describe('pickSettingsDirectory', () => {
  it('honors the env override above everything else', () => {
    expect(pickSettingsDirectory(['dev', 'prod'], 'stage')).toBe('stage');
    expect(pickSettingsDirectory([], 'stage')).toBe('stage');
  });

  it('uses the single built directory when exactly one exists', () => {
    expect(pickSettingsDirectory(['dev'])).toBe('dev');
  });

  it('falls back to prod when zero or multiple directories exist', () => {
    expect(pickSettingsDirectory([])).toBe('prod');
    expect(pickSettingsDirectory(['dev', 'stage'])).toBe('prod');
  });

  it('accepts a custom fallback', () => {
    expect(pickSettingsDirectory([], undefined, 'dev')).toBe('dev');
  });
});

describe('isServed', () => {
  it('includes settings files for the served env', () => {
    expect(isServed('settings/prod/static/js/main.js', 'prod')).toBe(true);
  });

  it('excludes settings files for a non-served env', () => {
    expect(isServed('settings/dev/static/js/main.js', 'prod')).toBe(false);
  });

  it('excludes a bare settings/<env> path with no trailing file', () => {
    expect(isServed('settings/prod', 'prod')).toBe(false);
  });

  it('includes non-settings paths', () => {
    expect(isServed('bundle/app.bundle.js', 'prod')).toBe(true);
  });

  it('excludes test/testDependencies bundles', () => {
    expect(isServed('bundle/test.bundle.js', 'prod')).toBe(false);
    expect(isServed('bundle/testDependencies.bundle.js', 'prod')).toBe(false);
  });
});

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

  it('content-addresses every served script in any_hashes', () => {
    const { manifest, count } = buildManifest({
      files: ['bundle/app.bundle.js', 'settings/prod/static/js/main.js'],
      readBytes,
      settingsDirectory: 'prod',
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
      settingsDirectory: 'prod',
    });

    expect(count).toBe(1);
    expect(manifest.any_hashes).toEqual([hashOf('bundle/app.bundle.js')]);
  });

  it('skips settings files for a non-served env', () => {
    const { manifest, count } = buildManifest({
      files: [
        'settings/prod/static/js/main.js',
        'settings/dev/static/js/main.js',
      ],
      readBytes,
      settingsDirectory: 'prod',
    });

    expect(count).toBe(1);
    expect(manifest.any_hashes).toEqual([
      hashOf('settings/prod/static/js/main.js'),
    ]);
  });

  it('de-duplicates identical content in any_hashes', () => {
    const { manifest, count } = buildManifest({
      files: ['bundle/a.js', 'bundle/b.js'],
      readBytes: () => Buffer.from('same-bytes'),
      settingsDirectory: 'prod',
    });

    expect(count).toBe(1);
    expect(manifest.any_hashes).toEqual([sha256Base64('same-bytes')]);
  });
});
