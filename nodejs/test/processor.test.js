'use strict';

const {
    isValidRecord,
    cleanRecord,
    dedupeBySku,
    processRecords,
    OUTPUT_FIELDS,
} = require('../src/processor');

function makeRecord(overrides = {}) {
    return {
        id: 'abc123',
        sku: 'SKU-AAA',
        name: 'Widget',
        price: '10.00',
        quantity: 5,
        category: 'electronics',
        last_updated: '2025-06-01T00:00:00.000Z',
        ...overrides,
    };
}

describe('isValidRecord', () => {
    test('accepts a record that satisfies every rule', () => {
        expect(isValidRecord(makeRecord())).toBe(true);
    });

    describe('id rule', () => {
        test('rejects empty string id', () => {
            expect(isValidRecord(makeRecord({ id: '' }))).toBe(false);
        });
        test('rejects null id', () => {
            expect(isValidRecord(makeRecord({ id: null }))).toBe(false);
        });
        test('rejects undefined / missing id', () => {
            const r = makeRecord();
            delete r.id;
            expect(isValidRecord(r)).toBe(false);
        });
        test('rejects id starting with BAD-ID', () => {
            expect(isValidRecord(makeRecord({ id: 'BAD-ID-12345' }))).toBe(false);
            expect(isValidRecord(makeRecord({ id: 'BAD-ID' }))).toBe(false);
        });
        test('accepts id that merely contains the substring "BAD-ID" not at the start', () => {
            expect(isValidRecord(makeRecord({ id: 'xxxBAD-ID' }))).toBe(true);
        });
    });

    describe('price rule', () => {
        test('rejects "N/A" price', () => {
            expect(isValidRecord(makeRecord({ price: 'N/A' }))).toBe(false);
        });
        test('rejects negative price as a number', () => {
            expect(isValidRecord(makeRecord({ price: -1 }))).toBe(false);
        });
        test('rejects negative price as a string', () => {
            expect(isValidRecord(makeRecord({ price: '-1.50' }))).toBe(false);
        });
        test('rejects unparseable price string', () => {
            expect(isValidRecord(makeRecord({ price: 'hello' }))).toBe(false);
        });
        test('accepts numeric string price', () => {
            expect(isValidRecord(makeRecord({ price: '99.99' }))).toBe(true);
        });
        test('accepts zero price', () => {
            expect(isValidRecord(makeRecord({ price: 0 }))).toBe(true);
        });
    });

    describe('quantity rule', () => {
        test('rejects string quantity ("ten")', () => {
            expect(isValidRecord(makeRecord({ quantity: 'ten' }))).toBe(false);
        });
        test('rejects null quantity', () => {
            expect(isValidRecord(makeRecord({ quantity: null }))).toBe(false);
        });
        test('rejects NaN quantity', () => {
            expect(isValidRecord(makeRecord({ quantity: NaN }))).toBe(false);
        });
        test('accepts zero quantity', () => {
            expect(isValidRecord(makeRecord({ quantity: 0 }))).toBe(true);
        });
    });

    test('rejects record with invalid last_updated', () => {
        expect(isValidRecord(makeRecord({ last_updated: 'not-a-date' }))).toBe(false);
    });
});

describe('cleanRecord', () => {
    test('strips <b> and </b> tags but keeps their content', () => {
        const r = cleanRecord(makeRecord({ name: 'Gadget <b>42</b>' }));
        expect(r.name).toBe('Gadget 42');
    });

    test('strips <i> and </i> tags but keeps their content', () => {
        const r = cleanRecord(makeRecord({ name: '<i>Hello</i> world' }));
        expect(r.name).toBe('Hello world');
    });

    test('does NOT strip <span> tags (not listed in the spec)', () => {
        const r = cleanRecord(makeRecord({ name: '<span>Item</span>' }));
        expect(r.name).toBe('<span>Item</span>');
    });

    test('trims leading and trailing whitespace', () => {
        const r = cleanRecord(makeRecord({ name: '  Product-10  ' }));
        expect(r.name).toBe('Product-10');
    });

    test('removes one or more leading question marks', () => {
        expect(cleanRecord(makeRecord({ name: '???Engine-7' })).name).toBe('Engine-7');
        expect(cleanRecord(makeRecord({ name: '?Engine' })).name).toBe('Engine');
    });

    test('removes whitespace, then leading ?, then any remaining whitespace', () => {
        expect(cleanRecord(makeRecord({ name: '  ???  Engine  ' })).name).toBe('Engine');
    });

    test('converts unknown category to uncategorized', () => {
        expect(cleanRecord(makeRecord({ category: 'unknown' })).category).toBe('uncategorized');
    });

    test('leaves other categories untouched', () => {
        expect(cleanRecord(makeRecord({ category: 'electronics' })).category).toBe('electronics');
    });

    test('converts string price to number', () => {
        const r = cleanRecord(makeRecord({ price: '160.58' }));
        expect(r.price).toBe(160.58);
        expect(typeof r.price).toBe('number');
    });

    test('drops extra fields not in the canonical shape', () => {
        const r = cleanRecord(makeRecord({ tag: '<script>alert(1)</script>', extra: 'junk' }));
        expect(Object.keys(r).sort()).toEqual([...OUTPUT_FIELDS].sort());
    });
});

describe('dedupeBySku', () => {
    test('keeps the most recent record for each duplicate sku', () => {
        const older = makeRecord({
            sku: 'SKU-DUP',
            id: 'old',
            last_updated: '2024-01-01T00:00:00.000Z',
        });
        const newer = makeRecord({
            sku: 'SKU-DUP',
            id: 'new',
            last_updated: '2025-12-01T00:00:00.000Z',
        });
        const { records, duplicatesDropped } = dedupeBySku([older, newer]);
        expect(records).toHaveLength(1);
        expect(records[0].id).toBe('new');
        expect(duplicatesDropped).toBe(1);
    });

    test('dedup is independent of input order (newer can appear first)', () => {
        const older = makeRecord({
            sku: 'SKU-DUP',
            id: 'old',
            last_updated: '2024-01-01T00:00:00.000Z',
        });
        const newer = makeRecord({
            sku: 'SKU-DUP',
            id: 'new',
            last_updated: '2025-12-01T00:00:00.000Z',
        });
        const { records } = dedupeBySku([newer, older]);
        expect(records[0].id).toBe('new');
    });

    test('counts every dropped duplicate (3 records, same sku → 2 dropped)', () => {
        const records = [
            makeRecord({ sku: 'X', id: 'a', last_updated: '2024-01-01T00:00:00.000Z' }),
            makeRecord({ sku: 'X', id: 'b', last_updated: '2024-06-01T00:00:00.000Z' }),
            makeRecord({ sku: 'X', id: 'c', last_updated: '2025-01-01T00:00:00.000Z' }),
        ];
        const { records: out, duplicatesDropped } = dedupeBySku(records);
        expect(out).toHaveLength(1);
        expect(out[0].id).toBe('c');
        expect(duplicatesDropped).toBe(2);
    });

    test('leaves records with unique skus alone', () => {
        const records = [
            makeRecord({ sku: 'A' }),
            makeRecord({ sku: 'B' }),
            makeRecord({ sku: 'C' }),
        ];
        const { records: out, duplicatesDropped } = dedupeBySku(records);
        expect(out).toHaveLength(3);
        expect(duplicatesDropped).toBe(0);
    });
});

describe('processRecords (end-to-end pipeline)', () => {
    test('happy path: validates, dedupes, and cleans', () => {
        const raw = [
            makeRecord({
                sku: 'SKU-1',
                name: 'Gadget <b>1</b>',
                price: '10.00',
                last_updated: '2025-01-01T00:00:00.000Z',
            }),
            makeRecord({
                sku: 'SKU-1',
                name: '???Gadget Newer',
                price: '11.00',
                last_updated: '2025-06-01T00:00:00.000Z',
            }),
            makeRecord({ sku: 'SKU-2', name: '  Product  ', category: 'unknown' }),
            makeRecord({ id: 'BAD-ID-foo', sku: 'SKU-3' }),
            makeRecord({ sku: 'SKU-4', price: 'N/A' }),
            makeRecord({ sku: 'SKU-5', quantity: 'ten' }),
        ];

        const { output, stats } = processRecords(raw);

        expect(stats.totalProcessed).toBe(6);
        expect(stats.invalidSkipped).toBe(3);
        expect(stats.duplicatesHandled).toBe(1);
        expect(stats.finalCount).toBe(2);

        const bySku = Object.fromEntries(output.map((r) => [r.sku, r]));
        expect(bySku['SKU-1'].name).toBe('Gadget Newer');
        expect(bySku['SKU-1'].price).toBe(11);
        expect(bySku['SKU-2'].name).toBe('Product');
        expect(bySku['SKU-2'].category).toBe('uncategorized');
    });

    test('returns empty output when every record is invalid', () => {
        const raw = [
            makeRecord({ id: '' }),
            makeRecord({ id: null }),
            makeRecord({ id: 'BAD-ID-1' }),
            makeRecord({ price: 'N/A' }),
            makeRecord({ quantity: 'ten' }),
        ];
        const { output, stats } = processRecords(raw);
        expect(output).toEqual([]);
        expect(stats.finalCount).toBe(0);
        expect(stats.invalidSkipped).toBe(5);
        expect(stats.duplicatesHandled).toBe(0);
    });

    test('output records have exactly the canonical 7 fields', () => {
        const raw = [makeRecord({ tag: 'extra', foo: 'bar' })];
        const { output } = processRecords(raw);
        expect(Object.keys(output[0]).sort()).toEqual([...OUTPUT_FIELDS].sort());
    });

    test('stats.totalProcessed reflects the raw input count, not the cleaned count', () => {
        const raw = Array.from({ length: 10 }, (_, i) =>
            makeRecord({ sku: `SKU-${i}`, id: i % 2 === 0 ? '' : `id-${i}` })
        );
        const { stats } = processRecords(raw);
        expect(stats.totalProcessed).toBe(10);
        expect(stats.invalidSkipped).toBe(5);
        expect(stats.finalCount).toBe(5);
    });
});
