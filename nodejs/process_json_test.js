#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const { parseCorruptedJsonArray } = require('./src/parser');
const { processRecords } = require('./src/processor');

const OUTPUT_FILE = 'output.json';

function isUrl(s) {
    return /^https?:\/\//i.test(s);
}

function fetchUrl(url, redirectsRemaining = 5) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, (res) => {
            if (
                res.statusCode &&
                res.statusCode >= 300 &&
                res.statusCode < 400 &&
                res.headers.location
            ) {
                if (redirectsRemaining <= 0) {
                    reject(new Error('Too many redirects'));
                    return;
                }
                res.resume();
                resolve(fetchUrl(res.headers.location, redirectsRemaining - 1));
                return;
            }
            if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                reject(new Error(`HTTP ${res.statusCode} for ${url}`));
                return;
            }
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
            res.on('error', reject);
        });
        req.on('error', reject);
        req.setTimeout(60000, () => {
            req.destroy(new Error('Request timed out after 60s'));
        });
    });
}

async function loadInput(source) {
    if (isUrl(source)) {
        process.stderr.write(`Fetching ${source.substring(0, 80)}${source.length > 80 ? '…' : ''}\n`);
        return fetchUrl(source);
    }
    const resolved = path.resolve(source);
    process.stderr.write(`Reading ${resolved}\n`);
    return fs.readFileSync(resolved, 'utf8');
}

function printSummary(stats) {
    const lines = [
        '',
        '=== Processing Summary ===',
        `Total records processed:        ${stats.totalProcessed}`,
        `Invalid records skipped:        ${stats.invalidSkipped}`,
        `Duplicate SKUs handled:         ${stats.duplicatesHandled}`,
        `Records in final output:        ${stats.finalCount}`,
        '',
    ];
    process.stdout.write(lines.join('\n'));
}

async function main() {
    const source = process.argv[2];
    if (!source) {
        process.stderr.write(
            'Usage: node process_json_test.js <URL_or_file_path>\n' +
                'Example: node process_json_test.js https://example.com/inventory.json\n' +
                '         node process_json_test.js ./fixtures/INVENTORY_C400.json\n'
        );
        process.exit(1);
    }

    const text = await loadInput(source);
    const { records: rawRecords, parseFailures } = parseCorruptedJsonArray(text);

    if (parseFailures > 0) {
        process.stderr.write(`Note: ${parseFailures} object(s) were unparseable and dropped.\n`);
    }

    const { output, stats } = processRecords(rawRecords);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    process.stderr.write(`Wrote ${output.length} record(s) to ${path.resolve(OUTPUT_FILE)}\n`);

    printSummary(stats);
}

if (require.main === module) {
    main().catch((err) => {
        process.stderr.write(`Error: ${err.message}\n`);
        process.exit(1);
    });
}

module.exports = { main, fetchUrl, loadInput };
