'use strict';

const { deduplicateBy } = require('../../src/lib/deduplicate-by');

describe('deduplicateBy', () => {
    const byId = (x) => x.id;
    const candidateGreater = (a, b) => a.value > b.value;

    test('leaves an empty input as an empty result', () => {
        expect(deduplicateBy([], { key: byId, keepWhere: candidateGreater })).toEqual({
            items: [],
            duplicatesDropped: 0,
        });
    });

    test('keeps unique items unchanged', () => {
        const result = deduplicateBy(
            [
                { id: 'a', value: 1 },
                { id: 'b', value: 2 },
            ],
            { key: byId, keepWhere: candidateGreater }
        );
        expect(result.items).toHaveLength(2);
        expect(result.duplicatesDropped).toBe(0);
    });

    test('keeps the winner per key according to keepWhere', () => {
        const result = deduplicateBy(
            [
                { id: 'a', value: 1 },
                { id: 'a', value: 5 },
                { id: 'a', value: 3 },
            ],
            { key: byId, keepWhere: candidateGreater }
        );
        expect(result.items).toEqual([{ id: 'a', value: 5 }]);
        expect(result.duplicatesDropped).toBe(2);
    });

    test('input order does not change the winner', () => {
        const forward = deduplicateBy(
            [
                { id: 'a', value: 1 },
                { id: 'a', value: 5 },
            ],
            { key: byId, keepWhere: candidateGreater }
        );
        const reverse = deduplicateBy(
            [
                { id: 'a', value: 5 },
                { id: 'a', value: 1 },
            ],
            { key: byId, keepWhere: candidateGreater }
        );
        expect(forward.items[0].value).toBe(5);
        expect(reverse.items[0].value).toBe(5);
    });

    test('counts every dropped record, not just keys with duplicates', () => {
        const result = deduplicateBy(
            [
                { id: 'a', value: 1 },
                { id: 'a', value: 2 },
                { id: 'a', value: 3 },
                { id: 'b', value: 1 },
            ],
            { key: byId, keepWhere: candidateGreater }
        );
        expect(result.duplicatesDropped).toBe(2);
    });

    test('throws when options are missing or malformed', () => {
        expect(() => deduplicateBy([], null)).toThrow(TypeError);
        expect(() => deduplicateBy([], { key: byId })).toThrow(TypeError);
        expect(() => deduplicateBy([], { keepWhere: candidateGreater })).toThrow(TypeError);
        expect(() => deduplicateBy([], { key: 'no', keepWhere: candidateGreater })).toThrow(
            TypeError
        );
    });
});
