/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Collect WAICT integrity violation reports.
 *
 * In report mode the browser does not block anything; it sends `waict-violation`
 * reports here via the Reporting API so we can find scripts whose hashes are
 * missing from, or do not match, the manifest. The Reporting API delivers a
 * JSON array of reports with content-type `application/reports+json`.
 */

'use strict';
const joi = require('joi');
const logger = require('../logging/log')();
const validation = require('../validation');
const { stripPIIFromUrl } = require('../url-scrubber');

const STRING_TYPE = validation.TYPES.STRING;

// Maximum reports accepted in a single POST. The Reporting API batches a small
// number of reports; anything beyond this is dropped by validation so a single
// request cannot be amplified into unbounded log/metric writes.
const MAX_REPORTS_PER_REQUEST = 100;

// A single Reporting API report. Only the fields we read are declared; celebrate
// is configured with stripUnknown for objects, so any other keys the browser
// sends are dropped rather than logged.
const REPORT_SCHEMA = joi.object().keys({
  type: STRING_TYPE.allow('').optional(),
  // Top-level `url` is used as a fallback document URL by some report shapes.
  url: STRING_TYPE.allow('').optional(),
  body: joi
    .object()
    .keys({
      // Reporting API standard is camelCase; snake_case aliases are tolerated
      // because the WAICT spec is still unstable.
      blockedURL: STRING_TYPE.allow('').optional(),
      blocked_url: STRING_TYPE.allow('').optional(),
      documentURL: STRING_TYPE.allow('').optional(),
      documentURI: STRING_TYPE.allow('').optional(),
      reason: STRING_TYPE.allow('').optional(),
      destination: STRING_TYPE.allow('').optional(),
    })
    .optional(),
});

// The browser posts an array of reports; older/other delivery may post a single
// object. Accept either, capping the array length.
const BODY_SCHEMA = joi
  .alternatives()
  .try(
    joi.array().items(REPORT_SCHEMA).max(MAX_REPORTS_PER_REQUEST),
    REPORT_SCHEMA
  );

module.exports = function (options = {}) {
  return {
    method: 'post',
    path: options.path,
    validate: {
      body: BODY_SCHEMA,
    },
    process: function (req, res) {
      // Acknowledge immediately; reports are best-effort telemetry.
      res.json({ success: true });

      const reports = Array.isArray(req.body) ? req.body : [req.body];

      // Guard the whole loop: the response is already sent, so a throw here
      // would otherwise reach the Express error handler on a finished response.
      try {
        reports.forEach((report) => {
          if (!report || typeof report !== 'object') {
            return;
          }

          const body = report.body || {};
          const blockedUrl = body.blockedURL || body.blocked_url;
          const documentURL = stripPIIFromUrl(
            body.documentURL || body.documentURI || report.url
          );

          logger.info(options.op, {
            agent: req.get('User-Agent'),
            type: report.type,
            // One of the WAICT spec's integrity-violation reasons.
            reason: body.reason,
            blocked: stripPIIFromUrl(blockedUrl),
            documentURL,
            destination: body.destination,
          });
        });
      } catch (err) {
        logger.warn('server.waict.report.error', { err: err && err.message });
      }
    },
  };
};

module.exports.BODY_SCHEMA = BODY_SCHEMA;
module.exports.MAX_REPORTS_PER_REQUEST = MAX_REPORTS_PER_REQUEST;
