/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Collect WAICT integrity violation reports.
 * 
 * In report mode the browser does not block anything; it *only* sends
 * `integrity-violation` reports via the Reporting API.
 */

'use strict';
const joi = require('joi');
const logger = require('../logging/log')();
const validation = require('../validation');
const { stripPIIFromUrl } = require('../url-scrubber');

const STRING_TYPE = validation.TYPES.LONG_STRING;

// Maximum reports accepted in a single POST (as in dom.reporting.delivering.maxReports)
const MAX_REPORTS_PER_REQUEST = 100;

// it's a simplified version of post-csp.js file
const BODY_SCHEMA = joi
  .array()
  .items(
    joi.object().keys({
      type: STRING_TYPE.allow('').optional(),
      url: STRING_TYPE.allow('').optional(),
      body: joi
        .object()
        .keys({
          blockedURL: STRING_TYPE.allow('').optional(),
          documentURL: STRING_TYPE.allow('').optional(),
          reason: STRING_TYPE.allow('').optional(),
          destination: STRING_TYPE.allow('').optional(),
        })
        .optional(),
    })
  )
  .max(MAX_REPORTS_PER_REQUEST); // could be several reports, inline csp

module.exports = function (options = {}) {
  return {
    method: 'post',
    path: options.path,
    validate: {
      body: BODY_SCHEMA,
    },
    process: function (req, res) {
      res.json({ success: true });

      req.body.forEach((report) => {
        if (report.type !== 'integrity-violation') {
          return;
        }
        const body = report.body || {};

        const entry = {
          agent: req.get('User-Agent'),
          type: report.type,
          reason: body.reason,
          blocked: stripPIIFromUrl(body.blockedURL),
          documentURL: stripPIIFromUrl(body.documentURL || report.url),
          destination: body.destination,
        };

        logger.info(options.op, entry);
      });
    },
  };
};

// for tests
module.exports.BODY_SCHEMA = BODY_SCHEMA;
module.exports.MAX_REPORTS_PER_REQUEST = MAX_REPORTS_PER_REQUEST;
