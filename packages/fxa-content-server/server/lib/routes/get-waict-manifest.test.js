/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

const fs = require('fs');
const path = require('path');

// The name must start with `mock` for jest's hoisting rules.
const mockLogger = { warn: jest.fn(), info: jest.fn(), error: jest.fn() };
jest.mock('../logging/log', () => () => mockLogger);
jest.mock('fs');

const getWaictManifest = require('./get-waict-manifest');

function mockConfig() {
  const values = {
    static_directory: 'app/dist',
    static_resource_url: 'https://cdn.example.com',
    'waict.manifestPath': '/waict-manifest.json',
  };
  return { get: (key) => values[key] };
}

function mockRes() {
  const res = {
    status: jest.fn(() => res),
    end: jest.fn(() => res),
    type: jest.fn(() => res),
    send: jest.fn(() => res),
    setHeader: jest.fn(() => res),
  };
  return res;
}

describe('get-waict-manifest route', () => {
  it('is a GET route served from the configured manifest path', () => {
    const route = getWaictManifest(mockConfig());
    expect(route.method).toBe('get');
    // change here if you change the location of waict manifest
    expect(route.path).toBe('/waict-manifest.json');
  });

  it('serves the correct waict manifest', () => {
    const body = Buffer.from(
      '{"hashes":{"{{{ staticResourceUrl }}}/bundle/app.bundle.js":"47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU="}}'
    );
    fs.readFile.mockImplementation((file, cb) => cb(null, body));

    const route = getWaictManifest(mockConfig());
    const res = mockRes();
    route.process({}, res);

    expect(fs.readFile).toHaveBeenCalledWith(
      path.join(__dirname, '../../../app/dist/waict-manifest.json'),
      expect.any(Function)
    );
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.type).toHaveBeenCalledWith(
      'application/waict-integrity-manifest'
    );
    expect(res.send).toHaveBeenCalledWith(
      '{"hashes":{"https://cdn.example.com/bundle/app.bundle.js":"47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU="}}'
    );
  });

  it('replaces every static resource URL placeholder', () => {
    const hash = '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=';
    const body = Buffer.from(
      JSON.stringify({
        hashes: {
          '{{{ staticResourceUrl }}}/bundle/app.bundle.js': hash,
          '{{{ staticResourceUrl }}}/bundle/head.bundle.js': hash,
          'https://cdn.accounts.firefox.com/settings/prod/static/js/main.js':
            hash,
        },
      })
    );
    fs.readFile.mockImplementation((file, cb) => cb(null, body));

    const res = mockRes();
    getWaictManifest(mockConfig()).process({}, res);

    const served = res.send.mock.calls[0][0];
    expect(served).not.toContain('{{{');
    expect(Object.keys(JSON.parse(served).hashes)).toEqual([
      'https://cdn.example.com/bundle/app.bundle.js',
      'https://cdn.example.com/bundle/head.bundle.js',
      'https://cdn.accounts.firefox.com/settings/prod/static/js/main.js',
    ]);
  });

  it('404s when the manifest is missing', () => {
    fs.readFile.mockImplementation((file, cb) =>
      cb(new Error('ENOENT'), null)
    );

    const route = getWaictManifest(mockConfig());
    const res = mockRes();
    route.process({}, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.end).toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith('waict.manifest.missing', {
      path: path.join(__dirname, '../../../app/dist/waict-manifest.json'),
    });
  });
});
