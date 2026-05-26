'use strict';

const { fetchUrlText } = require('./fetch-url-text');
const { readFileText } = require('./read-file-text');

const HTTP_URL_PATTERN = /^https?:\/\//i;

/**
 * Return true if the value looks like an http(s) URL.
 * @param {unknown} value
 * @returns {boolean}
 */
function isHttpUrl(value) {
    return typeof value === 'string' && HTTP_URL_PATTERN.test(value);
}

/**
 * Resolve a source string (URL *or* local path) to its UTF-8 text contents.
 *
 * Dependencies are injectable so that tests can substitute fake fetchers
 * and file readers without going to the network or the disk.
 *
 * @param {string} source
 * @param {{ fetchUrlText?: (url: string) => Promise<string>, readFileText?: (path: string) => Promise<string> }} [deps]
 * @returns {Promise<string>}
 */
async function loadTextSource(source, deps = {}) {
    const fetch = deps.fetchUrlText ?? fetchUrlText;
    const read = deps.readFileText ?? readFileText;

    if (isHttpUrl(source)) return fetch(source);
    return read(source);
}

module.exports = { loadTextSource, isHttpUrl };
