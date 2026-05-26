'use strict';

/**
 * `sku` is the dedup key. A missing or empty sku makes the record unusable
 * downstream, so it must be a non-empty string.
 *
 * @param {{ sku?: unknown }} record
 * @returns {boolean}
 */
function hasValidSku(record) {
    if (!record) return false;
    return typeof record.sku === 'string' && record.sku.length > 0;
}

module.exports = { hasValidSku };
