/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Middleware that emits the WAICT `Integrity-Policy-WAICT-v1` 
// response header in *report* mode.

'use strict';
const htmlOnly = require('./html-middleware');

// Must match between the Reporting-Endpoints header and the WAICT endpoints
// parameter.
const REPORT_ENDPOINT_NAME = 'default';

/**
 * Build the `Integrity-Policy-WAICT-v1` structured-field header value.
 */
function buildHeaderValue(config) {
  // `blocked-destinations` is a structured-field inner list of tokens, e.g.
  // `(script style)`. 
  // currently it's only scripts - see configuration.js:163-168 
  const destinations = config.blockedDestinations.join(' ');

  return [
    `max-age=${config.maxAge}`, // is not used (0) in the initial version
    'mode=report', // report does not block loading the resources
    `blocked-destinations=(${destinations})`, 
    `endpoints=(${REPORT_ENDPOINT_NAME})`,
    `manifest="${config.manifestPath}"`, 
  ].join(', ');
}

module.exports = function (config) {
  const headerValue = buildHeaderValue(config);
  const reportingEndpoints = `${REPORT_ENDPOINT_NAME}="${config.reportUri}"`;

  return htmlOnly((req, res, next) => {
    // AW: the spec says that it should be waict-violations, but we currently
    // do not support it:
    // see the todo /dom/webidl/Reporting.webidl#106
    res.setHeader('Reporting-Endpoints', reportingEndpoints);
    res.setHeader('Integrity-Policy-WAICT-v1', headerValue);

    next();
  });
};

module.exports.buildHeaderValue = buildHeaderValue;
module.exports.REPORT_ENDPOINT_NAME = REPORT_ENDPOINT_NAME;
