'use strict';

/**
 * `last_updated` is the dedup tiebreaker; an unparseable timestamp would make
 * deduplication non-deterministic, so the record is rejected.
 *
 * @param {{ last_updated?: unknown }} record
 * @returns {boolean}
 */
function hasValidLastUpdated(record) {
    if (!record) return false;
    const ts = record.last_updated;
    if (typeof ts !== 'string' || ts === '') return false;
    return !Number.isNaN(Date.parse(ts));
}

module.exports = { hasValidLastUpdated };
