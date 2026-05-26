# nodejs — JSON Processing Test

A Node.js implementation of the JSON Processing Test: download a corrupted JSON inventory feed, drop invalid records, deduplicate by SKU keeping the most recent record, clean the data, and write the result to `output.json`.

## Install

```bash
npm install
```

## Run

```bash
# Process a URL
node process_json_test.js https://example.com/inventory.json

# Or a local file
node process_json_test.js ./fixtures/INVENTORY_C400.json

# Or via the included npm script for the bundled sample
npm run process:sample
```

The script writes `output.json` to the current working directory and prints a summary to the console.

### Example output

```
=== Processing Summary ===
Total records processed:        4500
Invalid records skipped:        413
Duplicate SKUs handled:         18
Records in final output:        4069
```

## Test

```bash
npm test           # run once
npm run test:watch # watch mode
npm run test:coverage
```

## Pipeline

```
URL or file
     │
     ▼
parseCorruptedJsonArray()    ← brace-counter, drops truncated final object
     │
     ▼
isValidRecord()              ← id / price / quantity / sku / last_updated rules
     │  (counts invalid)
     ▼
dedupeBySku()                ← keep the record with the latest last_updated
     │  (counts duplicates)
     ▼
cleanRecord()                ← strip <b>/<i> tags, leading ?'s, whitespace,
     │                          remap unknown→uncategorized, drop extra fields
     ▼
output.json + console summary
```

## Validation rules implemented

| Rule | Source | Behavior |
|---|---|---|
| `id === ''` | Record Skipping | drop |
| `id === null` / missing | Record Skipping | drop |
| `id.startsWith('BAD-ID')` | Record Skipping | drop (data uses `BAD-ID-*`) |
| `price === 'N/A'` | Record Skipping | drop |
| `price < 0` (number or numeric string) | Record Skipping | drop |
| `price` not parseable as number | Record Skipping | drop |
| `quantity` not a finite number | Record Skipping | drop |
| `last_updated` not a parseable date | Required for dedup | drop |
| Same `sku`, different `last_updated` | Deduplication | keep most recent, drop the rest |
| `name` contains `<b>`, `</b>`, `<i>`, `</i>` | Data Cleaning | strip tags, keep content |
| `name` has leading `?` or whitespace | Data Cleaning | trim |
| `category === 'unknown'` | Data Cleaning | rename to `uncategorized` |
| Extra fields (e.g. `tag`) | Extra Fields | drop, project to canonical 7 fields |

Note on HTML cleaning: the spec lists exactly four tags (`<b>`, `</b>`, `<i>`, `</i>`). The fixture also contains malformed `<span>` tags; per the spec, those are **not** stripped.

Note on `BAD-ID`: the spec phrases the rule as "the id is `BAD-ID`" but the fixture uses `BAD-ID-*` (e.g. `BAD-ID-v5ne1g`). The implementation treats `BAD-ID` as a prefix marker.

## Layout

```
nodejs/
├── process_json_test.js   ← CLI entry point (URL or file)
├── src/
│   ├── parser.js          ← corrupted JSON → object[]
│   └── processor.js       ← validate, dedupe, clean
├── test/
│   ├── parser.test.js
│   └── processor.test.js
├── fixtures/
│   └── INVENTORY_C400.json
└── package.json
```
