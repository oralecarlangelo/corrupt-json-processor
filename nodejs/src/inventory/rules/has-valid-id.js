'use strict';

const BAD_ID_PREFIX = 'BAD-ID';

/**
 * Spec: skip records whose `id` is `null`, empty, or marked `BAD-ID`.
 * The fixture uses `BAD-ID-<suffix>` so we treat it as a prefix.
 *
 * @param {{ id?: unknown }} record
 * @returns {boolean}
 */
function hasValidId(record) {
    if (!record) return false;
    const id = record.id;
    if (typeof id !== 'string') return false;
    if (id === '') return false;
    if (id.startsWith(BAD_ID_PREFIX)) return false;
    return true;
}

module.exports = { hasValidId, BAD_ID_PREFIX };
