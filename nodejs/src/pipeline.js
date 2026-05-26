'use strict';

const { isValidInventoryRecord } = require('./inventory/rules');
const { cleanInventoryRecord } = require('./inventory/transforms');
const { dedupeBySku } = require('./inventory/dedupe-by-sku');

/**
 * Run the full inventory pipeline:
 *
 *   raw → validate (skip invalid) → dedupe (by sku, latest wins) → clean
 *
 * Validation runs first so invalid duplicates can't displace valid ones.
 * Cleaning runs last so the output is projected to the canonical 7-field
 * shape regardless of what extra fields the source had.
 *
 * Dependencies are injectable for testing: a caller can swap any stage with
 * a fake without monkey-patching modules.
 *
 * @param {object[]} rawRecords
 * @param {{
 *   isValid?: (rec: object) => boolean,
 *   dedupe?:  (recs: object[]) => { items: object[], duplicatesDropped: number },
 *   clean?:   (rec: object) => object,
 * }} [deps]
 * @returns {{
 *   output: object[],
 *   stats: {
 *     totalProcessed: number,
 *     invalidSkipped: number,
 *     duplicatesHandled: number,
 *     finalCount: number,
 *   },
 * }}
 */
function processInventoryRecords(rawRecords, deps = {}) {
    const isValid = deps.isValid ?? isValidInventoryRecord;
    const dedupe = deps.dedupe ?? dedupeBySku;
    const clean = deps.clean ?? cleanInventoryRecord;

    const totalProcessed = rawRecords.length;

    const valid = [];
    let invalidSkipped = 0;
    for (const record of rawRecords) {
        if (isValid(record)) valid.push(record);
        else invalidSkipped++;
    }

    const { items: deduped, duplicatesDropped } = dedupe(valid);
    const output = deduped.map(clean);

    return {
        output,
        stats: {
            totalProcessed,
            invalidSkipped,
            duplicatesHandled: duplicatesDropped,
            finalCount: output.length,
        },
    };
}

module.exports = { processInventoryRecords };
