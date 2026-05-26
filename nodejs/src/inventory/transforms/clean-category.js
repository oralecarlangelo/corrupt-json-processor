'use strict';

const CATEGORY_REMAP = Object.freeze({ unknown: 'uncategorized' });

/**
 * Spec: a category of `"unknown"` becomes `"uncategorized"`. All other
 * categories pass through unchanged. The remap table is exported so callers
 * can extend it without touching this file.
 *
 * @param {object} record
 * @returns {object}
 */
function cleanCategory(record) {
    const next = CATEGORY_REMAP[record.category];
    return next ? { ...record, category: next } : record;
}

module.exports = { cleanCategory, CATEGORY_REMAP };
