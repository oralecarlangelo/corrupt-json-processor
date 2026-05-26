'use strict';

/**
 * Spec: skip records whose `quantity` is not a number. Rejects strings like
 * `"ten"`, `null`, `undefined`, and `NaN`.
 *
 * @param {{ quantity?: unknown }} record
 * @returns {boolean}
 */
function hasValidQuantity(record) {
    if (!record) return false;
    const qty = record.quantity;
    return typeof qty === 'number' && Number.isFinite(qty);
}

module.exports = { hasValidQuantity };
