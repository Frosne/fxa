/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

module.exports = {
  testMatch: ['<rootDir>/server/**/*.test.js'],
  // The fake loggers are created once per file, so a test could otherwise
  // assert against a call made by an earlier test and pass when it shouldn't.
  clearMocks: true,
};
