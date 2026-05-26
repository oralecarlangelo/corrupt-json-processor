'use strict';

const { composeTransforms } = require('../../lib/compose-transforms');
const { cleanName } = require('./clean-name');
const { cleanCategory } = require('./clean-category');
const { coercePrice } = require('./coerce-price');
const { projectCanonicalFields } = require('./project-canonical-fields');

/**
 * Cleaning pipeline order:
 *   1. cleanName              — strip HTML, leading ?'s, whitespace
 *   2. cleanCategory          — unknown → uncategorized
 *   3. coercePrice            — numeric string → number
 *   4. projectCanonicalFields — drop extras (must run last)
 *
 * `projectCanonicalFields` is intentionally the final step so earlier
 * transforms don't need to know about the output shape.
 */
const INVENTORY_CLEANING_PIPELINE = [
    cleanName,
    cleanCategory,
    coercePrice,
    projectCanonicalFields,
];

const cleanInventoryRecord = composeTransforms(...INVENTORY_CLEANING_PIPELINE);

module.exports = {
    cleanInventoryRecord,
    INVENTORY_CLEANING_PIPELINE,
    cleanName,
    cleanCategory,
    coercePrice,
    projectCanonicalFields,
};
