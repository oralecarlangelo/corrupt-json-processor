'use strict';

/**
 * Deduplicate a list by a key, keeping the "winning" item per key according
 * to a user-supplied comparator.
 *
 * This is the generic engine behind any "keep the most-recent record per X"
 * use case. It knows nothing about SKUs, timestamps, or inventory.
 *
 * @template T
 * @param {Iterable<T>} items
 * @param {object}      options
 * @param {(item: T) => unknown}             options.key
 *   Produces the dedup key for an item.
 * @param {(candidate: T, existing: T) => boolean} options.keepWhere
 *   Return true to swap the candidate in for the current winner.
 * @returns {{ items: T[], duplicatesDropped: number }}
 *   `duplicatesDropped` counts records dropped, not keys that had duplicates.
 *   (3 records with the same key → 2 dropped.)
 */
function deduplicateBy(items, options) {
    if (!options || typeof options !== 'object') {
        throw new TypeError('deduplicateBy requires an options object');
    }
    const { key, keepWhere } = options;
    if (typeof key !== 'function') {
        throw new TypeError('options.key must be a function');
    }
    if (typeof keepWhere !== 'function') {
        throw new TypeError('options.keepWhere must be a function');
    }

    const winners = new Map();
    let duplicatesDropped = 0;

    for (const item of items) {
        const k = key(item);
        if (!winners.has(k)) {
            winners.set(k, item);
            continue;
        }
        duplicatesDropped++;
        const existing = winners.get(k);
        if (keepWhere(item, existing)) {
            winners.set(k, item);
        }
    }

    return { items: Array.from(winners.values()), duplicatesDropped };
}

module.exports = { deduplicateBy };
