'use strict';

/**
 * Parse an array of JSON objects out of a possibly corrupted text blob.
 *
 * The input is expected to look like a JSON array of objects, but the spec
 * guarantees it can be truncated mid-object at the end. Rather than relying
 * on JSON.parse for the whole document, we walk the text once, track brace
 * depth and string state, and emit each balanced top-level object. The
 * trailing partial object never reaches depth 0, so it is silently dropped.
 *
 * Objects that exist structurally but fail JSON.parse (malformed mid-stream)
 * are also dropped — the caller can count them via the `parseFailures` return
 * value if needed.
 *
 * @param {string} text
 * @returns {{ records: object[], parseFailures: number }}
 */
function parseCorruptedJsonArray(text) {
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
                // Unbalanced — reset and keep scanning.
                depth = 0;
                start = -1;
            }
        }
    }

    return { records, parseFailures };
}

module.exports = { parseCorruptedJsonArray };
