'use strict';

/**
 * Combine N predicate functions into a single short-circuiting validator.
 * Returns a function that yields `true` only if every input predicate
 * returns truthy. Validators are run in order; the first falsy short-circuits.
 *
 * Together with single-rule modules in `inventory/rules/*`, this enables the
 * Open/Closed principle for validation: add a rule by writing a new file and
 * appending it to the list, never by editing an existing rule.
 *
 * @template T
 * @param  {...((value: T) => boolean)} validators
 * @returns {(value: T) => boolean}
 */
function composeValidators(...validators) {
    for (const v of validators) {
        if (typeof v !== 'function') {
            throw new TypeError('composeValidators expects functions');
        }
    }
    return function compositeValidator(value) {
        for (const v of validators) {
            if (!v(value)) return false;
        }
        return true;
    };
}

module.exports = { composeValidators };
