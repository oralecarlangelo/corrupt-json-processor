'use strict';

/**
 * Salvage a sequence of JSON objects from a possibly corrupted text blob that
 * is *supposed* to be a JSON array of objects but may be truncated mid-object
 * or contain mid-stream malformed objects.
 *
 * The algorithm is a single linear scan that tracks brace depth and string
 * state. Each balanced top-level object is emitted; the trailing partial
 * object never reaches depth 0, so it is silently discarded. Objects that
 * exist structurally but fail JSON.parse are reported via `parseFailures`.
 *
 * This module is domain-agnostic — it knows nothing about inventory.
 *
 * @param {string} text
 * @returns {{ records: object[], parseFailures: number }}
 */
function parseCorruptedJsonArray(text) {
    if (typeof text !== 'string') return { records: [], parseFailures: 0 };

    const records = [];
    let parseFailures = 0;

    let depth = 0;
    let inString = false;
    let escape = false;
    let start = -1;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        if (inString) {
            if (escape) {
                escape = false;
                continue;
            }
            if (ch === '\\') {
                escape = true;
                continue;
            }
            if (ch === '"') {
                inString = false;
            }
            continue;
        }

        if (ch === '"') {
            inString = true;
            continue;
        }

        if (ch === '{') {
            if (depth === 0) start = i;
            depth++;
        } else if (ch === '}') {
            depth--;
            if (depth === 0 && start !== -1) {
                const candidate = text.substring(start, i + 1);
                try {
                    records.push(JSON.parse(candidate));
                } catch (_e) {
                    parseFailures++;
                }
                start = -1;
            } else if (depth < 0) {
                depth = 0;
                start = -1;
            }
        }
    }

    return { records, parseFailures };
}

module.exports = { parseCorruptedJsonArray };
