'use strict';

const {
    hasValidId,
    hasValidPrice,
    hasValidQuantity,
    hasValidSku,
    hasValidLastUpdated,
    isValidInventoryRecord,
    INVENTORY_VALIDATION_RULES,
} = require('../../../src/inventory/rules');

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

describe('hasValidId', () => {
    test('accepts a regular string id', () => {
        expect(hasValidId(makeRecord())).toBe(true);
    });
    test('rejects empty string', () => {
        expect(hasValidId(makeRecord({ id: '' }))).toBe(false);
    });
    test('rejects null and undefined', () => {
        expect(hasValidId(makeRecord({ id: null }))).toBe(false);
        const r = makeRecord();
        delete r.id;
        expect(hasValidId(r)).toBe(false);
    });
    test('rejects ids starting with BAD-ID', () => {
        expect(hasValidId(makeRecord({ id: 'BAD-ID' }))).toBe(false);
        expect(hasValidId(makeRecord({ id: 'BAD-ID-12345' }))).toBe(false);
    });
    test('accepts ids that merely contain BAD-ID elsewhere', () => {
        expect(hasValidId(makeRecord({ id: 'xxBAD-ID' }))).toBe(true);
    });
    test('rejects non-string id', () => {
        expect(hasValidId(makeRecord({ id: 123 }))).toBe(false);
    });
});

describe('hasValidPrice', () => {
    test('accepts numeric string', () => {
        expect(hasValidPrice(makeRecord({ price: '10.00' }))).toBe(true);
    });
    test('accepts a number', () => {
        expect(hasValidPrice(makeRecord({ price: 10 }))).toBe(true);
    });
    test('accepts zero', () => {
        expect(hasValidPrice(makeRecord({ price: 0 }))).toBe(true);
    });
    test('rejects "N/A"', () => {
        expect(hasValidPrice(makeRecord({ price: 'N/A' }))).toBe(false);
    });
    test('rejects negative number', () => {
        expect(hasValidPrice(makeRecord({ price: -1 }))).toBe(false);
    });
    test('rejects negative numeric string', () => {
        expect(hasValidPrice(makeRecord({ price: '-1.50' }))).toBe(false);
    });
    test('rejects unparseable string', () => {
        expect(hasValidPrice(makeRecord({ price: 'hello' }))).toBe(false);
    });
    test('rejects null and undefined', () => {
        expect(hasValidPrice(makeRecord({ price: null }))).toBe(false);
        const r = makeRecord();
        delete r.price;
        expect(hasValidPrice(r)).toBe(false);
    });
});

describe('hasValidQuantity', () => {
    test('accepts a finite number', () => {
        expect(hasValidQuantity(makeRecord({ quantity: 0 }))).toBe(true);
        expect(hasValidQuantity(makeRecord({ quantity: 42 }))).toBe(true);
    });
    test('rejects non-number quantity', () => {
        expect(hasValidQuantity(makeRecord({ quantity: 'ten' }))).toBe(false);
    });
    test('rejects NaN, Infinity, null, undefined', () => {
        expect(hasValidQuantity(makeRecord({ quantity: NaN }))).toBe(false);
        expect(hasValidQuantity(makeRecord({ quantity: Infinity }))).toBe(false);
        expect(hasValidQuantity(makeRecord({ quantity: null }))).toBe(false);
        const r = makeRecord();
        delete r.quantity;
        expect(hasValidQuantity(r)).toBe(false);
    });
});

describe('hasValidSku', () => {
    test('accepts a non-empty string', () => {
        expect(hasValidSku(makeRecord({ sku: 'SKU-1' }))).toBe(true);
    });
    test('rejects empty string and non-string', () => {
        expect(hasValidSku(makeRecord({ sku: '' }))).toBe(false);
        expect(hasValidSku(makeRecord({ sku: 42 }))).toBe(false);
        expect(hasValidSku(makeRecord({ sku: null }))).toBe(false);
    });
});

describe('hasValidLastUpdated', () => {
    test('accepts an ISO 8601 string', () => {
        expect(
            hasValidLastUpdated(makeRecord({ last_updated: '2025-01-01T00:00:00.000Z' }))
        ).toBe(true);
    });
    test('rejects an unparseable timestamp', () => {
        expect(hasValidLastUpdated(makeRecord({ last_updated: 'yesterday' }))).toBe(false);
    });
    test('rejects empty and non-string', () => {
        expect(hasValidLastUpdated(makeRecord({ last_updated: '' }))).toBe(false);
        expect(hasValidLastUpdated(makeRecord({ last_updated: 12345 }))).toBe(false);
    });
});

describe('isValidInventoryRecord (composed)', () => {
    test('accepts a record satisfying every rule', () => {
        expect(isValidInventoryRecord(makeRecord())).toBe(true);
    });
    test('rejects a record violating any rule', () => {
        expect(isValidInventoryRecord(makeRecord({ price: 'N/A' }))).toBe(false);
        expect(isValidInventoryRecord(makeRecord({ id: '' }))).toBe(false);
        expect(isValidInventoryRecord(makeRecord({ quantity: 'ten' }))).toBe(false);
    });
    test('rejects non-object input', () => {
        expect(isValidInventoryRecord(null)).toBe(false);
        expect(isValidInventoryRecord(undefined)).toBe(false);
    });
    test('exports all rules as a list', () => {
        expect(INVENTORY_VALIDATION_RULES).toHaveLength(5);
        for (const rule of INVENTORY_VALIDATION_RULES) {
            expect(typeof rule).toBe('function');
        }
    });
});
