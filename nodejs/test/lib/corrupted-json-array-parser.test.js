'use strict';

const {
    parseCorruptedJsonArray,
} = require('../../src/lib/corrupted-json-array-parser');

describe('parseCorruptedJsonArray', () => {
    test('parses a clean JSON array of objects', () => {
        const { records, parseFailures } = parseCorruptedJsonArray(
            '[{"a":1},{"a":2},{"a":3}]'
        );
        expect(records).toEqual([{ a: 1 }, { a: 2 }, { a: 3 }]);
        expect(parseFailures).toBe(0);
    });

    test('handles whitespace and newlines between objects', () => {
        const { records } = parseCorruptedJsonArray('[\n  {"a":1},\n  {"a":2}\n]');
        expect(records).toHaveLength(2);
    });

    test('drops the final partial object when truncated mid-record', () => {
        const text = '[{"a":1},{"a":2},{"a":3,"b":';
        const { records, parseFailures } = parseCorruptedJsonArray(text);
        expect(records).toEqual([{ a: 1 }, { a: 2 }]);
        // The third object never reaches depth 0, so it's silently dropped,
        // not counted as a parse failure.
        expect(parseFailures).toBe(0);
    });

    test('drops the final partial object when truncated mid-string-value', () => {
        const { records } = parseCorruptedJsonArray('[{"a":"one"},{"a":"tw');
        expect(records).toEqual([{ a: 'one' }]);
    });

    test('handles braces inside string values (does not confuse depth tracking)', () => {
        const { records } = parseCorruptedJsonArray(
            '[{"a":"{nested}"},{"b":"more {braces} here"}]'
        );
        expect(records).toEqual([{ a: '{nested}' }, { b: 'more {braces} here' }]);
    });

    test('handles escaped quotes inside string values', () => {
        const { records } = parseCorruptedJsonArray(
            '[{"a":"she said \\"hi\\""},{"b":1}]'
        );
        expect(records).toEqual([{ a: 'she said "hi"' }, { b: 1 }]);
    });

    test('handles escaped backslashes followed by a quote', () => {
        const { records } = parseCorruptedJsonArray('[{"a":"path\\\\"},{"b":2}]');
        expect(records).toEqual([{ a: 'path\\' }, { b: 2 }]);
    });

    test('handles nested objects', () => {
        const { records } = parseCorruptedJsonArray('[{"a":{"b":{"c":1}}},{"x":2}]');
        expect(records).toEqual([{ a: { b: { c: 1 } } }, { x: 2 }]);
    });

    test('returns empty array for input with no objects', () => {
        expect(parseCorruptedJsonArray('').records).toEqual([]);
        expect(parseCorruptedJsonArray('[]').records).toEqual([]);
        expect(parseCorruptedJsonArray('   ').records).toEqual([]);
    });

    test('returns empty for non-string input', () => {
        expect(parseCorruptedJsonArray(null)).toEqual({ records: [], parseFailures: 0 });
        expect(parseCorruptedJsonArray(undefined)).toEqual({ records: [], parseFailures: 0 });
        expect(parseCorruptedJsonArray(42)).toEqual({ records: [], parseFailures: 0 });
    });

    test('counts mid-stream malformed objects as parse failures', () => {
        const text = '[{"a":1},{"this is not valid"},{"c":3}]';
        const { records, parseFailures } = parseCorruptedJsonArray(text);
        expect(records).toEqual([{ a: 1 }, { c: 3 }]);
        expect(parseFailures).toBe(1);
    });

    test('recovers from a stray closing brace at the top level', () => {
        const { records } = parseCorruptedJsonArray('}{"a":1},{"b":2}');
        expect(records).toEqual([{ a: 1 }, { b: 2 }]);
    });
});
