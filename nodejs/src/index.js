'use strict';

/**
 * Public API barrel. Importers can `require('json-processing-test-nodejs')`
 * and get both the generic library and the inventory-specific pipeline.
 */

const { parseCorruptedJsonArray } = require('./lib/corrupted-json-array-parser');
const { stripHtmlTags } = require('./lib/strip-html-tags');
const { deduplicateBy } = require('./lib/deduplicate-by');
const { composeValidators } = require('./lib/compose-validators');
const { composeTransforms } = require('./lib/compose-transforms');
const { loadTextSource, isHttpUrl } = require('./lib/source/load-text-source');
const { fetchUrlText } = require('./lib/source/fetch-url-text');
const { readFileText } = require('./lib/source/read-file-text');

const { CANONICAL_FIELDS } = require('./inventory/canonical-fields');
const inventoryRules = require('./inventory/rules');
const inventoryTransforms = require('./inventory/transforms');
const { dedupeBySku } = require('./inventory/dedupe-by-sku');

const { processInventoryRecords } = require('./pipeline');

module.exports = {
    // Generic, reusable library
    parseCorruptedJsonArray,
    stripHtmlTags,
    deduplicateBy,
    composeValidators,
    composeTransforms,
    loadTextSource,
    fetchUrlText,
    readFileText,
    isHttpUrl,

    // Inventory domain
    CANONICAL_FIELDS,
    ...inventoryRules,
    ...inventoryTransforms,
    dedupeBySku,

    // High-level pipeline
    processInventoryRecords,
};
