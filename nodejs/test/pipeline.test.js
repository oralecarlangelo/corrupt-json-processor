'use strict';

const { processInventoryRecords } = require('../src/pipeline');
const { CANONICAL_FIELDS } = require('../src/inventory/canonical-fields');

function makeRecord(overrides = {}) {
    return {
        id: 'abc',
        sku: 'SKU-A',
        name: 'Widget',
        price: '10.00',
        quantity: 5,
        category: 'electronics',
        last_updated: '2025-01-01T00:00:00.000Z',
        ...overrides,
    };
}

describe('processInventoryRecords', () => {
    test('happy path: validates, dedupes (newest wins), cleans, projects', () => {
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

        const { output, stats } = processInventoryRecords(raw);

        expect(stats).toEqual({
            totalProcessed: 6,
            invalidSkipped: 3,
            duplicatesHandled: 1,
            finalCount: 2,
        });

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
        const { output, stats } = processInventoryRecords(raw);
        expect(output).toEqual([]);
        expect(stats.finalCount).toBe(0);
        expect(stats.invalidSkipped).toBe(5);
        expect(stats.duplicatesHandled).toBe(0);
    });

    test('output records have exactly the canonical 7 fields', () => {
        const raw = [makeRecord({ tag: 'extra', foo: 'bar' })];
        const { output } = processInventoryRecords(raw);
        expect(Object.keys(output[0]).sort()).toEqual([...CANONICAL_FIELDS].sort());
    });

    test('totalProcessed reflects the raw input count, not the cleaned count', () => {
        const raw = Array.from({ length: 10 }, (_, i) =>
            makeRecord({ sku: `SKU-${i}`, id: i % 2 === 0 ? '' : `id-${i}` })
        );
        const { stats } = processInventoryRecords(raw);
        expect(stats.totalProcessed).toBe(10);
        expect(stats.invalidSkipped).toBe(5);
        expect(stats.finalCount).toBe(5);
    });

    test('honours injected dependencies (DI for testability)', () => {
        const isValid = jest.fn().mockReturnValue(true);
        const dedupe = jest.fn().mockImplementation((items) => ({
            items,
            duplicatesDropped: 0,
        }));
        const clean = jest.fn().mockImplementation((r) => ({ id: r.id }));

        const raw = [{ id: 'x' }];
        const { output, stats } = processInventoryRecords(raw, { isValid, dedupe, clean });

        expect(isValid).toHaveBeenCalledTimes(1);
        expect(dedupe).toHaveBeenCalledWith([{ id: 'x' }]);
        expect(clean).toHaveBeenCalledTimes(1);
        expect(output).toEqual([{ id: 'x' }]);
        expect(stats.finalCount).toBe(1);
    });
});
