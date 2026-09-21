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
    // smallest waict manifest
    const body = Buffer.from(
      '{"any_hashes":["47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU="]}'
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
    expect(res.send).toHaveBeenCalledWith(body);
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
