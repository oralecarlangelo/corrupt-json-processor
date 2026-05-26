'use strict';

const {
    cleanName,
    cleanCategory,
    coercePrice,
    projectCanonicalFields,
    cleanInventoryRecord,
    INVENTORY_CLEANING_PIPELINE,
} = require('../../../src/inventory/transforms');
const { CANONICAL_FIELDS } = require('../../../src/inventory/canonical-fields');

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

describe('cleanName', () => {
    test('strips <b>/</b> while preserving inner content', () => {
        expect(cleanName(makeRecord({ name: 'Gadget <b>42</b>' })).name).toBe('Gadget 42');
    });
    test('strips <i>/</i>', () => {
        expect(cleanName(makeRecord({ name: '<i>Hello</i> world' })).name).toBe('Hello world');
    });
    test('does NOT strip <span> (not listed in the spec)', () => {
        expect(cleanName(makeRecord({ name: '<span>Item</span>' })).name).toBe(
            '<span>Item</span>'
        );
    });
    test('trims leading and trailing whitespace', () => {
        expect(cleanName(makeRecord({ name: '  Product-10  ' })).name).toBe('Product-10');
    });
    test('removes leading ? characters', () => {
        expect(cleanName(makeRecord({ name: '???Engine-7' })).name).toBe('Engine-7');
    });
    test('removes whitespace, then leading ?, then any remaining whitespace', () => {
        expect(cleanName(makeRecord({ name: '  ???  Engine  ' })).name).toBe('Engine');
    });
    test('returns empty name for non-string input', () => {
        expect(cleanName(makeRecord({ name: null })).name).toBe('');
        expect(cleanName(makeRecord({ name: 42 })).name).toBe('');
    });
    test('is pure (does not mutate input)', () => {
        const rec = makeRecord({ name: '  ???Item  ' });
        const before = { ...rec };
        cleanName(rec);
        expect(rec).toEqual(before);
    });
});

describe('cleanCategory', () => {
    test('remaps "unknown" to "uncategorized"', () => {
        expect(cleanCategory(makeRecord({ category: 'unknown' })).category).toBe(
            'uncategorized'
        );
    });
    test('leaves other categories untouched', () => {
        expect(cleanCategory(makeRecord({ category: 'electronics' })).category).toBe(
            'electronics'
        );
    });
    test('is pure (does not mutate input)', () => {
        const rec = makeRecord({ category: 'unknown' });
        const before = { ...rec };
        cleanCategory(rec);
        expect(rec).toEqual(before);
    });
});

describe('coercePrice', () => {
    test('converts numeric string to number', () => {
        const r = coercePrice(makeRecord({ price: '160.58' }));
        expect(r.price).toBe(160.58);
        expect(typeof r.price).toBe('number');
    });
    test('returns input untouched when price is already a number', () => {
        const input = makeRecord({ price: 99 });
        expect(coercePrice(input)).toBe(input);
    });
});

describe('projectCanonicalFields', () => {
    test('drops fields not in CANONICAL_FIELDS', () => {
        const r = projectCanonicalFields({ ...makeRecord(), tag: 'x', extra: 1 });
        expect(Object.keys(r).sort()).toEqual([...CANONICAL_FIELDS].sort());
    });
    test('preserves field order', () => {
        const r = projectCanonicalFields(makeRecord());
        expect(Object.keys(r)).toEqual([...CANONICAL_FIELDS]);
    });
    test('missing source field becomes undefined', () => {
        const partial = { id: 'a', sku: 'b' };
        const r = projectCanonicalFields(partial);
        expect(r).toEqual({
            id: 'a',
            sku: 'b',
            name: undefined,
            price: undefined,
            quantity: undefined,
            category: undefined,
            last_updated: undefined,
        });
    });
});

describe('cleanInventoryRecord (composed)', () => {
    test('runs every step and projects to canonical fields', () => {
        const out = cleanInventoryRecord(
            makeRecord({
                name: '  ???Gadget <b>42</b>  ',
                category: 'unknown',
                price: '12.50',
                tag: '<script>alert(1)</script>',
            })
        );
        expect(out.name).toBe('Gadget 42');
        expect(out.category).toBe('uncategorized');
        expect(out.price).toBe(12.5);
        expect('tag' in out).toBe(false);
        expect(Object.keys(out).sort()).toEqual([...CANONICAL_FIELDS].sort());
    });

    test('exports the pipeline steps', () => {
        expect(INVENTORY_CLEANING_PIPELINE).toHaveLength(4);
        for (const step of INVENTORY_CLEANING_PIPELINE) {
            expect(typeof step).toBe('function');
        }
    });
});
