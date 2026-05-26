#!/usr/bin/env node
'use strict';

/**
 * Single-file version of the JSON Processing Test.
 *
 * Drop-in equivalent of `process_json_test.js` + everything under `src/`, with
 * the same behavior. Zero npm dependencies — just Node.js built-ins.
 *
 *   node process_json_test.single.js <URL_or_file_path> [output_file]
 *
 * The modular version under `src/` is the recommended one for real use and
 * for reading the code (SOLID + reusable helpers). This file exists so you
 * can copy it anywhere and run it without setting up a project.
 */

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const https = require('https');
const http = require('http');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CANONICAL_FIELDS = [
    'id',
    'sku',
    'name',
    'price',
    'quantity',
    'category',
    'last_updated',
];
const BAD_ID_PREFIX = 'BAD-ID';
const INVALID_PRICE_MARKERS = new Set(['N/A']);
const CATEGORY_REMAP = { unknown: 'uncategorized' };
const STRIPPED_HTML_TAGS = ['b', 'i'];

// ---------------------------------------------------------------------------
// Source loading: URL or file → text
// ---------------------------------------------------------------------------

function isHttpUrl(value) {
    return typeof value === 'string' && /^https?:\/\//i.test(value);
}

function fetchUrlText(url, { timeoutMs = 60_000, maxRedirects = 5 } = {}) {
    return new Promise((resolve, reject) => {
        const visit = (currentUrl, redirectsRemaining) => {
            const client = currentUrl.startsWith('https') ? https : http;
            const req = client.get(currentUrl, (res) => {
                const status = res.statusCode ?? 0;
                if (status >= 300 && status < 400 && res.headers.location) {
                    if (redirectsRemaining <= 0) {
                        reject(new Error('Too many redirects'));
                        return;
                    }
                    res.resume();
                    visit(res.headers.location, redirectsRemaining - 1);
                    return;
                }
                if (status < 200 || status >= 300) {
                    reject(new Error(`HTTP ${status} for ${currentUrl}`));
                    return;
                }
                const chunks = [];
                res.on('data', (c) => chunks.push(c));
                res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
                res.on('error', reject);
            });
            req.on('error', reject);
            req.setTimeout(timeoutMs, () => {
                req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
            });
        };
        visit(url, maxRedirects);
    });
}

async function loadTextSource(source) {
    if (isHttpUrl(source)) return fetchUrlText(source);
    return fsp.readFile(source, 'utf8');
}

// ---------------------------------------------------------------------------
// Corrupted JSON array parser (brace counter)
// ---------------------------------------------------------------------------

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
            if (ch === '"') inString = false;
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
                try {
                    records.push(JSON.parse(text.substring(start, i + 1)));
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

// ---------------------------------------------------------------------------
// Validation rules
// ---------------------------------------------------------------------------

function hasValidId(r) {
    return (
        r &&
        typeof r.id === 'string' &&
        r.id !== '' &&
        !r.id.startsWith(BAD_ID_PREFIX)
    );
}

function hasValidPrice(r) {
    if (!r || r.price == null) return false;
    if (typeof r.price === 'string' && INVALID_PRICE_MARKERS.has(r.price)) return false;
    const n = typeof r.price === 'number' ? r.price : Number(r.price);
    return Number.isFinite(n) && n >= 0;
}

function hasValidQuantity(r) {
    return r && typeof r.quantity === 'number' && Number.isFinite(r.quantity);
}

function hasValidSku(r) {
    return r && typeof r.sku === 'string' && r.sku.length > 0;
}

function hasValidLastUpdated(r) {
    return (
        r &&
        typeof r.last_updated === 'string' &&
        r.last_updated !== '' &&
        !Number.isNaN(Date.parse(r.last_updated))
    );
}

function isValidInventoryRecord(record) {
    return (
        hasValidId(record) &&
        hasValidPrice(record) &&
        hasValidQuantity(record) &&
        hasValidSku(record) &&
        hasValidLastUpdated(record)
    );
}

// ---------------------------------------------------------------------------
// Cleaning steps
// ---------------------------------------------------------------------------

function stripHtmlTags(input, tagNames) {
    if (typeof input !== 'string') return input;
    if (!Array.isArray(tagNames) || tagNames.length === 0) return input;
    const pattern = new RegExp(
        `</?(?:${tagNames.join('|')})(?:\\s[^>]*)?\\s*/?>`,
        'gi'
    );
    return input.replace(pattern, '');
}

function cleanName(record) {
    const raw = record.name;
    if (typeof raw !== 'string') return { ...record, name: '' };
    const name = stripHtmlTags(raw, STRIPPED_HTML_TAGS)
        .trim()
        .replace(/^\?+/, '')
        .trim();
    return { ...record, name };
}

function cleanCategory(record) {
    const next = CATEGORY_REMAP[record.category];
    return next ? { ...record, category: next } : record;
}

function coercePrice(record) {
    if (typeof record.price === 'number') return record;
    return { ...record, price: Number(record.price) };
}

function projectCanonicalFields(record) {
    const out = {};
    for (const field of CANONICAL_FIELDS) out[field] = record[field];
    return out;
}

function cleanInventoryRecord(record) {
    return projectCanonicalFields(coercePrice(cleanCategory(cleanName(record))));
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

function dedupeBySku(records) {
    const winners = new Map();
    let duplicatesDropped = 0;

    for (const record of records) {
        const existing = winners.get(record.sku);
        if (!existing) {
            winners.set(record.sku, record);
            continue;
        }
        duplicatesDropped++;
        if (Date.parse(record.last_updated) > Date.parse(existing.last_updated)) {
            winners.set(record.sku, record);
        }
    }
    return { items: Array.from(winners.values()), duplicatesDropped };
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

function processInventoryRecords(rawRecords) {
    const totalProcessed = rawRecords.length;
    const valid = [];
    let invalidSkipped = 0;

    for (const record of rawRecords) {
        if (isValidInventoryRecord(record)) valid.push(record);
        else invalidSkipped++;
    }

    const { items: deduped, duplicatesDropped } = dedupeBySku(valid);
    const output = deduped.map(cleanInventoryRecord);

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

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function formatSummary(stats) {
    return [
        '',
        '=== Processing Summary ===',
        `Total records processed:        ${stats.totalProcessed}`,
        `Invalid records skipped:        ${stats.invalidSkipped}`,
        `Duplicate SKUs handled:         ${stats.duplicatesHandled}`,
        `Records in final output:        ${stats.finalCount}`,
        '',
    ].join('\n');
}

async function main(argv = process.argv) {
    const source = argv[2];
    const outputFile = argv[3] ?? 'output.json';

    if (!source) {
        process.stderr.write(
            'Usage: node process_json_test.single.js <URL_or_file_path> [output_file]\n'
        );
        process.exit(1);
    }

    process.stderr.write(`${isHttpUrl(source) ? 'Fetching' : 'Reading'} ${source}\n`);
    const text = await loadTextSource(source);

    const { records, parseFailures } = parseCorruptedJsonArray(text);
    if (parseFailures > 0) {
        process.stderr.write(`Note: ${parseFailures} object(s) were unparseable and dropped.\n`);
    }

    const { output, stats } = processInventoryRecords(records);

    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    process.stderr.write(`Wrote ${output.length} record(s) to ${path.resolve(outputFile)}\n`);
    process.stdout.write(formatSummary(stats));
}

if (require.main === module) {
    main().catch((err) => {
        process.stderr.write(`Error: ${err.message}\n`);
        process.exit(1);
    });
}

module.exports = {
    parseCorruptedJsonArray,
    stripHtmlTags,
    dedupeBySku,
    isValidInventoryRecord,
    cleanInventoryRecord,
    processInventoryRecords,
    loadTextSource,
    fetchUrlText,
    isHttpUrl,
    main,
};
