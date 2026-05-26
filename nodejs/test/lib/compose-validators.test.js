'use strict';

const { composeValidators } = require('../../src/lib/compose-validators');

describe('composeValidators', () => {
    test('returns true only when every validator returns truthy', () => {
        const check = composeValidators(
            (n) => n > 0,
            (n) => n < 100,
            (n) => n % 2 === 0
        );
        expect(check(50)).toBe(true);
    });

    test('returns false if any validator fails', () => {
        const check = composeValidators(
            (n) => n > 0,
            (n) => n < 100
        );
        expect(check(-1)).toBe(false);
        expect(check(200)).toBe(false);
    });

    test('short-circuits at the first failure', () => {
        const second = jest.fn().mockReturnValue(true);
        const check = composeValidators(() => false, second);
        expect(check('anything')).toBe(false);
        expect(second).not.toHaveBeenCalled();
    });

    test('empty composition is vacuously true', () => {
        const check = composeValidators();
        expect(check('x')).toBe(true);
    });

    test('throws when a non-function is passed', () => {
        expect(() => composeValidators(() => true, 'nope')).toThrow(TypeError);
    });
});
