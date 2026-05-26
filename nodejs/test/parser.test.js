'use strict';

const { parseCorruptedJsonArray } = require('../src/parser');

describe('parseCorruptedJsonArray', () => {
    test('parses a clean JSON array of objects', () => {
        const text = '[{"a":1},{"a":2},{"a":3}]';
        const { records, parseFailures } = parseCorruptedJsonArray(text);
        expect(records).toEqual([{ a: 1 }, { a: 2 }, { a: 3 }]);
        expect(parseFailures).toBe(0);
    });

    test('handles whitespace and newlines between objects', () => {
        const text = '[\n  {"a":1},\n  {"a":2}\n]';
        const { records } = parseCorruptedJsonArray(text);
        expect(records).toHaveLength(2);
    });

    test('drops the final partial object when truncated mid-record', () => {
        const text = '[{"a":1},{"a":2},{"a":3,"b":';
        const { records, parseFailures } = parseCorruptedJsonArray(text);
        expect(records).toEqual([{ a: 1 }, { a: 2 }]);
        // The third object never closes its outer brace, so it's silently dropped,
        // not counted as a parse failure.
        expect(parseFailures).toBe(0);
    });

    test('drops the final partial object when truncated mid-string-value', () => {
        const text = '[{"a":"one"},{"a":"tw';
        const { records } = parseCorruptedJsonArray(text);
        expect(records).toEqual([{ a: 'one' }]);
    });

    test('handles braces inside string values (does not confuse depth tracking)', () => {
        const text = '[{"a":"{nested}"},{"b":"more {braces} here"}]';
        const { records } = parseCorruptedJsonArray(text);
        expect(records).toEqual([{ a: '{nested}' }, { b: 'more {braces} here' }]);
    });

    test('handles escaped quotes inside string values', () => {
        const text = '[{"a":"she said \\"hi\\""},{"b":1}]';
        const { records } = parseCorruptedJsonArray(text);
        expect(records).toEqual([{ a: 'she said "hi"' }, { b: 1 }]);
    });

    test('handles escaped backslashes followed by a quote', () => {
        const text = '[{"a":"path\\\\"},{"b":2}]';
        const { records } = parseCorruptedJsonArray(text);
        expect(records).toEqual([{ a: 'path\\' }, { b: 2 }]);
    });

    test('handles nested objects', () => {
        const text = '[{"a":{"b":{"c":1}}},{"x":2}]';
        const { records } = parseCorruptedJsonArray(text);
        expect(records).toEqual([{ a: { b: { c: 1 } } }, { x: 2 }]);
    });

    test('returns empty array for input with no objects', () => {
        expect(parseCorruptedJsonArray('').records).toEqual([]);
        expect(parseCorruptedJsonArray('[]').records).toEqual([]);
        expect(parseCorruptedJsonArray('   ').records).toEqual([]);
    });

    test('counts mid-stream malformed objects as parse failures', () => {
        // Looks like an object but has invalid JSON inside braces.
        const text = '[{"a":1},{"this is not valid"},{"c":3}]';
        const { records, parseFailures } = parseCorruptedJsonArray(text);
        expect(records).toEqual([{ a: 1 }, { c: 3 }]);
        expect(parseFailures).toBe(1);
    });
});
