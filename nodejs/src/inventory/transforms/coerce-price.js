'use strict';

/**
 * The source feed encodes price as a numeric string (`"160.58"`). The spec
 * requires the output to use `number`. Validation guarantees the value is
 * parseable and non-negative by the time it reaches this step.
 *
 * @param {object} record
 * @returns {object}
 */
function coercePrice(record) {
    if (typeof record.price === 'number') return record;
    return { ...record, price: Number(record.price) };
}

module.exports = { coercePrice };
