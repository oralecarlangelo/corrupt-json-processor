'use strict';

const { stripHtmlTags } = require('../../lib/strip-html-tags');

const STRIPPED_HTML_TAGS = Object.freeze(['b', 'i']);

/**
 * Spec: names may have leading/trailing whitespace, leading `?`s, and `<b>`
 * or `<i>` tags. Strip the tags first (so any whitespace that surrounded
 * them is exposed), then trim, then drop leading `?`s, then trim again
 * in case the question marks sat next to spaces.
 *
 * Other HTML tags (e.g. `<span>` in the fixture) are intentionally left
 * alone — the spec only names these four.
 *
 * @param {object} record
 * @returns {object} new record with cleaned `name`
 */
function cleanName(record) {
    const raw = record.name;
    if (typeof raw !== 'string') return { ...record, name: '' };
    const name = stripHtmlTags(raw, STRIPPED_HTML_TAGS)
        .trim()
        .replace(/^\?+/, '')
        .trim();
    return { ...record, name };
}

module.exports = { cleanName, STRIPPED_HTML_TAGS };
