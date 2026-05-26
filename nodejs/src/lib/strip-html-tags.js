'use strict';

const VALID_TAG_NAME = /^[a-zA-Z][a-zA-Z0-9-]*$/;

/**
 * Remove a specific set of HTML tags from a string while preserving their
 * inner content. Matching is case-insensitive and tolerates attributes and
 * self-closing forms (`<b class="x">`, `<b />`). Tags not in the list are
 * left untouched.
 *
 * This module is domain-agnostic.
 *
 * @param {string} input
 * @param {string[]} tagNames - bare tag names, e.g. ['b', 'i', 'span']
 * @returns {string} the cleaned string, or the original input unchanged if it
 *                   is not a string or `tagNames` is empty
 */
function stripHtmlTags(input, tagNames) {
    if (typeof input !== 'string') return input;
    if (!Array.isArray(tagNames) || tagNames.length === 0) return input;

    for (const name of tagNames) {
        if (typeof name !== 'string' || !VALID_TAG_NAME.test(name)) {
            throw new TypeError(`Invalid HTML tag name: ${JSON.stringify(name)}`);
        }
    }

    const alternation = tagNames.join('|');
    const pattern = new RegExp(`</?(?:${alternation})(?:\\s[^>]*)?\\s*/?>`, 'gi');
    return input.replace(pattern, '');
}

module.exports = { stripHtmlTags };
