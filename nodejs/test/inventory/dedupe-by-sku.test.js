'use strict';

const { dedupeBySku } = require('../../src/inventory/dedupe-by-sku');

function makeRecord(overrides = {}) {
    return {
        id: 'abc',
        sku: 'SKU-A',
        name: 'Widget',
        price: 10,
        quantity: 5,
        category: 'electronics',
        last_updated: '2025-01-01T00:00:00.000Z',
        ...overrides,
    };
}

describe('dedupeBySku', () => {
    test('keeps the record with the most recent last_updated', () => {
        const older = makeRecord({ id: 'old', last_updated: '2024-01-01T00:00:00.000Z' });
        const newer = makeRecord({ id: 'new', last_updated: '2025-12-01T00:00:00.000Z' });

        const { items, duplicatesDropped } = dedupeBySku([older, newer]);
        expect(items).toHaveLength(1);
        expect(items[0].id).toBe('new');
        expect(duplicatesDropped).toBe(1);
    });

    test('is independent of input order', () => {
        const older = makeRecord({ id: 'old', last_updated: '2024-01-01T00:00:00.000Z' });
        const newer = makeRecord({ id: 'new', last_updated: '2025-12-01T00:00:00.000Z' });

        const reversed = dedupeBySku([newer, older]);
        expect(reversed.items[0].id).toBe('new');
    });

    test('counts every dropped record (3 same-sku → 2 dropped)', () => {
        const records = [
            makeRecord({ id: 'a', last_updated: '2024-01-01T00:00:00.000Z' }),
            makeRecord({ id: 'b', last_updated: '2024-06-01T00:00:00.000Z' }),
            makeRecord({ id: 'c', last_updated: '2025-01-01T00:00:00.000Z' }),
        ];
        const { items, duplicatesDropped } = dedupeBySku(records);
        expect(items).toHaveLength(1);
        expect(items[0].id).toBe('c');
        expect(duplicatesDropped).toBe(2);
    });

    test('leaves records with unique skus alone', () => {
        const records = [
            makeRecord({ sku: 'A' }),
            makeRecord({ sku: 'B' }),
            makeRecord({ sku: 'C' }),
        ];
        const { items, duplicatesDropped } = dedupeBySku(records);
        expect(items).toHaveLength(3);
        expect(duplicatesDropped).toBe(0);
    });
});
