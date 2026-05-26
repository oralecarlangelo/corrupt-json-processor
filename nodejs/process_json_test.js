#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const {
    loadTextSource,
    isHttpUrl,
    parseCorruptedJsonArray,
    processInventoryRecords,
} = require('./src');

const DEFAULT_OUTPUT_FILE = 'output.json';

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

function usage() {
    return (
        'Usage: node process_json_test.js <URL_or_file_path> [output_file]\n' +
        'Example: node process_json_test.js https://example.com/inventory.json\n' +
        '         node process_json_test.js ./fixtures/INVENTORY_C400.json out.json\n'
    );
}

async function main(argv = process.argv) {
    const source = argv[2];
    const outputFile = argv[3] ?? DEFAULT_OUTPUT_FILE;

    if (!source) {
        process.stderr.write(usage());
        process.exit(1);
    }

    process.stderr.write(`${isHttpUrl(source) ? 'Fetching' : 'Reading'} ${source}\n`);
    const text = await loadTextSource(source);

    const { records: rawRecords, parseFailures } = parseCorruptedJsonArray(text);
    if (parseFailures > 0) {
        process.stderr.write(`Note: ${parseFailures} object(s) were unparseable and dropped.\n`);
    }

    const { output, stats } = processInventoryRecords(rawRecords);

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

module.exports = { main, formatSummary };
