/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';
const url = require('url');

function stripPIIFromUrl(urlToScrub) {
  if (!urlToScrub || typeof urlToScrub !== 'string') {
    return '';
  }

  let parsedUrl;

  try {
    parsedUrl = url.parse(urlToScrub, true);
  } catch (e) {
    // failed to parse the given url
    return '';
  }

  if (!parsedUrl.query.email && !parsedUrl.query.uid) {
    return urlToScrub;
  }

  delete parsedUrl.query.email;
  delete parsedUrl.query.uid;

  // delete parsedUrl.search or else format returns the old querystring.
  delete parsedUrl.search;

  return url.format(parsedUrl);
}

module.exports = { stripPIIFromUrl };
