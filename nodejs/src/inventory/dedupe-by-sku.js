'use strict';

const { deduplicateBy } = require('../lib/deduplicate-by');

/**
 * Dedupe inventory records by `sku`, keeping the one with the most recent
 * `last_updated`. Thin domain-specific binding over the generic
 * `deduplicateBy` engine — this file holds the inventory-specific policy,
 * the engine holds the algorithm.
 *
 * @param {object[]} records
 * @returns {{ items: object[], duplicatesDropped: number }}
 */
function dedupeBySku(records) {
    return deduplicateBy(records, {
        key: (record) => record.sku,
        keepWhere: (candidate, existing) =>
            Date.parse(candidate.last_updated) > Date.parse(existing.last_updated),
    });
}

module.exports = { dedupeBySku };
