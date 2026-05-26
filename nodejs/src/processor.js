'use strict';

const OUTPUT_FIELDS = ['id', 'sku', 'name', 'price', 'quantity', 'category', 'last_updated'];

/**
 * Validate a raw record against the spec's "Record Skipping" rules.
 * Returns true if the record should be kept, false if it should be skipped.
 */
function isValidRecord(rec) {
    if (!rec || typeof rec !== 'object') return false;

    // id rule: skip BAD-ID, null, or empty string. The data uses BAD-ID-* as a
    // prefix marker, so match the prefix.
    const id = rec.id;
    if (id == null) return false;
    if (typeof id !== 'string') return false;
    if (id === '') return false;
    if (id.startsWith('BAD-ID')) return false;

    // price rule: skip "N/A" or any negative numeric value. Prices arrive as
    // strings in the source data; coerce before checking.
    const rawPrice = rec.price;
    if (rawPrice === 'N/A' || rawPrice == null) return false;
    const price = typeof rawPrice === 'number' ? rawPrice : Number(rawPrice);
    if (!Number.isFinite(price) || price < 0) return false;

    // quantity rule: must be a finite number (not a string like "ten").
    const qty = rec.quantity;
    if (typeof qty !== 'number' || !Number.isFinite(qty)) return false;

    // sku and last_updated are required for dedup; reject if missing.
    if (typeof rec.sku !== 'string' || !rec.sku) return false;
    if (typeof rec.last_updated !== 'string' || !rec.last_updated) return false;
    if (Number.isNaN(Date.parse(rec.last_updated))) return false;

    return true;
}

/**
 * Apply the spec's "Data Cleaning" rules to a single record and project it
 * to the canonical 7-field shape (dropping extra fields).
 */
function cleanRecord(rec) {
    let name = typeof rec.name === 'string' ? rec.name : '';

    // Strip the four listed HTML tags but preserve their content.
    name = name.replace(/<\/?(?:b|i)>/g, '');

    // Trim whitespace, drop leading ?'s, trim again in case ?'s sat next to spaces.
    name = name.trim().replace(/^\?+/, '').trim();

    let category = rec.category;
    if (category === 'unknown') category = 'uncategorized';

    return {
        id: rec.id,
        sku: rec.sku,
        name,
        price: typeof rec.price === 'number' ? rec.price : Number(rec.price),
        quantity: rec.quantity,
        category,
        last_updated: rec.last_updated,
    };
}

/**
 * Deduplicate records by `sku`, keeping the one with the most recent
 * `last_updated`. Returns the survivors and the count of records that were
 * dropped as duplicates (NOT the count of skus that had duplicates).
 */
function dedupeBySku(records) {
    const bySku = new Map();
    let duplicatesDropped = 0;

    for (const rec of records) {
        const existing = bySku.get(rec.sku);
        if (!existing) {
            bySku.set(rec.sku, rec);
            continue;
        }
        duplicatesDropped++;
        const newer = Date.parse(rec.last_updated) > Date.parse(existing.last_updated);
        if (newer) bySku.set(rec.sku, rec);
    }

    return { records: Array.from(bySku.values()), duplicatesDropped };
}

/**
 * Run the full pipeline on an array of raw records.
 *
 * Pipeline order: validate → dedupe → clean. Cleaning runs last so the output
 * is always projected to the canonical 7-field shape. Dedup runs against
 * already-validated records so invalid duplicates do not displace valid ones.
 *
 * @param {object[]} rawRecords
 * @returns {{ output: object[], stats: { totalProcessed: number, invalidSkipped: number, duplicatesHandled: number, finalCount: number } }}
 */
function processRecords(rawRecords) {
    const totalProcessed = rawRecords.length;

    const valid = [];
    let invalidSkipped = 0;
    for (const rec of rawRecords) {
        if (isValidRecord(rec)) valid.push(rec);
        else invalidSkipped++;
    }

    const { records: deduped, duplicatesDropped } = dedupeBySku(valid);
    const cleaned = deduped.map(cleanRecord);

    return {
        output: cleaned,
        stats: {
            totalProcessed,
            invalidSkipped,
            duplicatesHandled: duplicatesDropped,
            finalCount: cleaned.length,
        },
    };
}

module.exports = {
    OUTPUT_FIELDS,
    isValidRecord,
    cleanRecord,
    dedupeBySku,
    processRecords,
};
