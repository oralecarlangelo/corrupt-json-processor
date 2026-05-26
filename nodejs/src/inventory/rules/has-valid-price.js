'use strict';

const INVALID_PRICE_MARKERS = new Set(['N/A']);

/**
 * Spec: skip records whose `price` is `"N/A"` or negative. The source feed
 * stores prices as strings, so we coerce before the numeric check.
 *
 * @param {{ price?: unknown }} record
 * @returns {boolean}
 */
function hasValidPrice(record) {
    if (!record) return false;
    const raw = record.price;
    if (raw == null) return false;
    if (typeof raw === 'string' && INVALID_PRICE_MARKERS.has(raw)) return false;
    const price = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(price)) return false;
    if (price < 0) return false;
    return true;
}

module.exports = { hasValidPrice, INVALID_PRICE_MARKERS };
