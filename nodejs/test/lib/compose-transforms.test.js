'use strict';

const { composeTransforms } = require('../../src/lib/compose-transforms');

describe('composeTransforms', () => {
    test('applies transforms left-to-right', () => {
        const pipeline = composeTransforms(
            (n) => n + 1,
            (n) => n * 2
        );
        expect(pipeline(3)).toBe(8); // (3+1) * 2
    });

    test('empty composition is identity', () => {
        const pipeline = composeTransforms();
        const value = { x: 1 };
        expect(pipeline(value)).toBe(value);
    });

    test('threads object state through each step', () => {
        const pipeline = composeTransforms(
            (r) => ({ ...r, a: 1 }),
            (r) => ({ ...r, b: 2 }),
            (r) => ({ ...r, c: r.a + r.b })
        );
        expect(pipeline({})).toEqual({ a: 1, b: 2, c: 3 });
    });

    test('throws when a non-function is passed', () => {
        expect(() => composeTransforms((x) => x, null)).toThrow(TypeError);
    });
});
