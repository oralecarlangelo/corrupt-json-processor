'use strict';

const { composeValidators } = require('../../lib/compose-validators');
const { hasValidId } = require('./has-valid-id');
const { hasValidPrice } = require('./has-valid-price');
const { hasValidQuantity } = require('./has-valid-quantity');
const { hasValidSku } = require('./has-valid-sku');
const { hasValidLastUpdated } = require('./has-valid-last-updated');

/**
 * The ordered list of rules an inventory record must satisfy. Exported so
 * that callers can compose a subset or insert new rules without touching
 * existing files (Open/Closed).
 */
const INVENTORY_VALIDATION_RULES = [
    hasValidId,
    hasValidPrice,
    hasValidQuantity,
    hasValidSku,
    hasValidLastUpdated,
];

const isValidInventoryRecord = composeValidators(...INVENTORY_VALIDATION_RULES);

module.exports = {
    isValidInventoryRecord,
    INVENTORY_VALIDATION_RULES,
    hasValidId,
    hasValidPrice,
    hasValidQuantity,
    hasValidSku,
    hasValidLastUpdated,
};
