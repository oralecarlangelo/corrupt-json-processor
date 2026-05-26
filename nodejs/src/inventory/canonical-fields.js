'use strict';

/**
 * The exact set of fields that survive in a cleaned inventory record, in the
 * canonical order. Used by `project-canonical-fields` to drop extras and by
 * tests to assert the output shape.
 */
const CANONICAL_FIELDS = Object.freeze([
    'id',
    'sku',
    'name',
    'price',
    'quantity',
    'category',
    'last_updated',
]);

module.exports = { CANONICAL_FIELDS };
