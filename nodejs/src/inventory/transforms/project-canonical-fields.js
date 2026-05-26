'use strict';

const { CANONICAL_FIELDS } = require('../canonical-fields');

/**
 * Spec: extra fields on the source record (e.g. `tag: "<script>…"`) must be
 * dropped. This step runs last in the cleaning pipeline so that earlier
 * transforms don't have to know about the output shape — they just mutate
 * fields, and this step projects to the canonical 7 in canonical order.
 *
 * @param {object} record
 * @returns {object}
 */
function projectCanonicalFields(record) {
    const projected = {};
    for (const field of CANONICAL_FIELDS) {
        projected[field] = record[field];
    }
    return projected;
}

module.exports = { projectCanonicalFields };
