'use strict';

/**
 * Combine N pure transform functions into a single left-to-right pipeline.
 * Each transform receives the output of the previous one. With single-purpose
 * modules in `inventory/transforms/*`, this enables the Open/Closed principle
 * for cleaning: add a step by writing a new file and appending it to the list.
 *
 * @template T
 * @param  {...((value: T) => T)} transforms
 * @returns {(value: T) => T}
 */
function composeTransforms(...transforms) {
    for (const t of transforms) {
        if (typeof t !== 'function') {
            throw new TypeError('composeTransforms expects functions');
        }
    }
    return function compositeTransform(value) {
        let result = value;
        for (const t of transforms) {
            result = t(result);
        }
        return result;
    };
}

module.exports = { composeTransforms };
