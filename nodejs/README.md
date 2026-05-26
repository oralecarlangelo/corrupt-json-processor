# nodejs — JSON Processing Test

A Node.js solution to the JSON Processing Test: download a corrupted inventory feed, skip invalid records, deduplicate by SKU (keeping the most recent), clean the data, and write the result to `output.json`.

The code is organized around **single-responsibility modules** and a **reusable, domain-agnostic library** in `src/lib/`. The inventory-specific logic in `src/inventory/` is built by composing the generic primitives.

## Install

```bash
npm install
```

## Run

```bash
# URL
node process_json_test.js https://example.com/inventory.json

# Local file
node process_json_test.js ./fixtures/INVENTORY_C400.json

# Custom output path
node process_json_test.js ./fixtures/INVENTORY_C400.json /tmp/out.json

# Or the npm script for the bundled sample
npm run process:sample
```

Writes `output.json` to the current working directory and prints a summary.

### Single-file version

If you'd rather have everything in one self-contained file (no `src/`, no npm install), use [`process_json_test.single.js`](process_json_test.single.js). Zero dependencies, identical output:

```bash
node process_json_test.single.js ./fixtures/INVENTORY_C400.json
```

Copy that one file anywhere and it just works. The modular version under `src/` is still the recommended one for reading and extending the code.

### Example output

```
=== Processing Summary ===
Total records processed:        4500
Invalid records skipped:        452
Duplicate SKUs handled:         594
Records in final output:        3454
```

## Test

```bash
npm test               # 101 tests across 11 suites
npm run test:watch
npm run test:coverage  # 100% function & line coverage
```

## Architecture

```
process_json_test.js                          ← CLI: parse argv, load source,
                                                run pipeline, write output
src/
├── index.js                                  ← public-API barrel
├── lib/                                      ── DOMAIN-AGNOSTIC, REUSABLE
│   ├── corrupted-json-array-parser.js        ←  brace-counter JSON salvage
│   ├── strip-html-tags.js                    ←  remove specific tags safely
│   ├── deduplicate-by.js                     ←  generic dedupe(key, keepWhere)
│   ├── compose-validators.js                 ←  N predicates → 1 predicate
│   ├── compose-transforms.js                 ←  N functions → 1 pipeline
│   └── source/
│       ├── fetch-url-text.js                 ←  HTTP(S) → string
│       ├── read-file-text.js                 ←  file → string
│       └── load-text-source.js               ←  URL or path → string (DI-ready)
├── inventory/                                ── INVENTORY DOMAIN
│   ├── canonical-fields.js                   ←  output shape constant
│   ├── rules/                                ←  one file per validation rule
│   │   ├── has-valid-id.js
│   │   ├── has-valid-price.js
│   │   ├── has-valid-quantity.js
│   │   ├── has-valid-sku.js
│   │   ├── has-valid-last-updated.js
│   │   └── index.js                          ←  composes rules via composeValidators
│   ├── transforms/                           ←  one file per cleaning step
│   │   ├── clean-name.js
│   │   ├── clean-category.js
│   │   ├── coerce-price.js
│   │   ├── project-canonical-fields.js
│   │   └── index.js                          ←  composes via composeTransforms
│   └── dedupe-by-sku.js                      ←  thin binding over deduplicateBy
├── pipeline.js                               ←  validate → dedupe → clean (DI-ready)
└── ...
```

### How SOLID maps to the layout

| Principle | Where it shows up |
|---|---|
| **Single responsibility** | Each file does one thing. `has-valid-price.js` knows about the price rule and nothing else; `strip-html-tags.js` doesn't know what "name" or "inventory" means. |
| **Open/closed** | Adding a new validation rule = create a new file under `rules/` and append it to the array in `rules/index.js`. No existing rule has to change. Same for cleaning steps. |
| **Liskov substitution** | All rule modules expose the same shape (`(record) => boolean`); all transform modules expose `(record) => record`. They are freely interchangeable in `composeValidators` / `composeTransforms`. |
| **Interface segregation** | Each module exports a tiny, focused surface. The CLI only needs three symbols from `src/index.js`; tests pull just the helper they need. |
| **Dependency inversion** | `pipeline.js` and `load-text-source.js` accept their dependencies via a `deps` parameter. Tests inject fakes; production gets the defaults. |

### Pipeline order (and why)

```
parseCorruptedJsonArray()          // raw text → object[]
        │
        ▼
isValidInventoryRecord()           // skip invalid records first so they
        │  invalidSkipped++         //  can't displace valid ones in dedupe
        ▼
dedupeBySku()                      // keep max(last_updated) per sku
        │  duplicatesHandled++
        ▼
cleanInventoryRecord()             // 4 transforms; project to canonical
        │                            shape MUST run last
        ▼
output.json + console summary
```

## Validation rules

| Rule | File | Behavior |
|---|---|---|
| Bad / missing id | [`has-valid-id.js`](src/inventory/rules/has-valid-id.js) | drop if `id` is null, empty, non-string, or starts with `BAD-ID` |
| Bad price | [`has-valid-price.js`](src/inventory/rules/has-valid-price.js) | drop if `"N/A"`, unparseable, or negative |
| Bad quantity | [`has-valid-quantity.js`](src/inventory/rules/has-valid-quantity.js) | drop if not a finite number |
| Missing sku | [`has-valid-sku.js`](src/inventory/rules/has-valid-sku.js) | drop if missing — sku is the dedup key |
| Bad timestamp | [`has-valid-last-updated.js`](src/inventory/rules/has-valid-last-updated.js) | drop if `last_updated` is unparseable — it's the dedup tiebreaker |

## Cleaning steps

| Step | File | Behavior |
|---|---|---|
| Clean name | [`clean-name.js`](src/inventory/transforms/clean-name.js) | strip `<b>`/`<i>`, trim, drop leading `?`, trim again |
| Clean category | [`clean-category.js`](src/inventory/transforms/clean-category.js) | `unknown` → `uncategorized` |
| Coerce price | [`coerce-price.js`](src/inventory/transforms/coerce-price.js) | numeric string → number |
| Project fields | [`project-canonical-fields.js`](src/inventory/transforms/project-canonical-fields.js) | drop extras; output exactly the 7 canonical fields in canonical order |

## Spec interpretation notes

- **`BAD-ID`** — the spec says "the id is `BAD-ID`" but the fixture uses `BAD-ID-<suffix>`. The implementation treats `BAD-ID` as a **prefix**.
- **HTML stripping** — the spec lists exactly `<b>`, `</b>`, `<i>`, `</i>`. The fixture also has `<span>` tags in some names; those are **not** stripped, per spec. The generic `stripHtmlTags(input, tagNames)` helper takes the tag list as an argument, so the policy stays in the domain layer.
- **Second URL** — the spec mentions an "all invalid" URL; the same pipeline handles it (an empty `output.json` is written and `invalidSkipped` reflects everything).

## Reusing the library

```js
const {
  parseCorruptedJsonArray,
  deduplicateBy,
  stripHtmlTags,
  composeValidators,
  composeTransforms,
  loadTextSource,
} = require('json-processing-test-nodejs');

// e.g. dedupe orders by customer, keeping the max-total order:
const { items } = deduplicateBy(orders, {
  key: (o) => o.customerId,
  keepWhere: (cand, existing) => cand.total > existing.total,
});
```
