/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';
const { URL } = require('url');

const PII_QUERY_PARAMS = ['email', 'uid'];

function stripPIIFromUrl(urlToScrub) {
  if (!urlToScrub || typeof urlToScrub !== 'string') {
    return '';
  }

  let parsed;
  let isRelative = false;
  try {
    parsed = new URL(urlToScrub);
  } catch (e) {
    try {
      parsed = new URL(urlToScrub, 'https://waict.invalid');
      isRelative = true;
    } catch (e2) {
      return urlToScrub;
    }
  }

  const hasPII =
    PII_QUERY_PARAMS.some((p) => parsed.searchParams.has(p)) ||
    parsed.hash !== '';
  if (!hasPII) {
    return urlToScrub;
  }

  PII_QUERY_PARAMS.forEach((p) => parsed.searchParams.delete(p));
  parsed.hash = '';

  return isRelative ? parsed.pathname + parsed.search : parsed.toString();
}

module.exports = { stripPIIFromUrl };
