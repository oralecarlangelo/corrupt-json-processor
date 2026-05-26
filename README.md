# JSON Processing Test

Clean and validate a corrupted JSON inventory feed and emit `output.json`.

The input is a JSON array of inventory records that is **structurally corrupted** — the file is truncated mid-object at the end. It also contains **content-level errors**: bad IDs, `"N/A"` prices, string quantities (`"ten"`), malformed HTML in names, `unknown` categories, extra fields, and duplicate SKUs.

The script must:

1. **Skip** records with bad `id`, bad `price`, or non-numeric `quantity`.
2. **Deduplicate** by `sku`, keeping the most recent `last_updated`.
3. **Clean** names (strip `<b>/<i>` tags, leading `?` and whitespace) and remap `category: "unknown"` → `"uncategorized"`.
4. **Drop extra fields** so every output record has exactly the canonical 7 fields.
5. **Print a summary** and write `output.json`.

## Repo layout

```
.
└── nodejs/        ← Node.js implementation (with Jest tests)
```

The spec lets you complete the task in either Python or Node.js; this repo uses Node.js. See [nodejs/README.md](nodejs/README.md) for full docs, the validation rule table, and how to run it.

## Quick start

```bash
cd nodejs
npm install
npm test                    # 101 tests across 11 suites, 100% line + function coverage
npm run process:sample      # process the bundled fixture
```

## Architecture

The Node.js solution is built in two layers:

- **`src/lib/`** — domain-agnostic, reusable utilities: a corrupted-JSON parser, a generic `deduplicateBy(key, keepWhere)` engine, an HTML-tag stripper, validator/transform composers, and URL/file source loaders. None of them know anything about inventory.
- **`src/inventory/`** — inventory-specific policy on top of the lib: one file per validation rule, one file per cleaning step, plus a thin `dedupe-by-sku` binding.

`src/pipeline.js` wires them together; `process_json_test.js` is a thin CLI. Every public function is dependency-injectable for testing. See [nodejs/README.md](nodejs/README.md) for the full layout, SOLID notes, and rule tables.

## CI

GitHub Actions runs `npm test` on every push and PR across Node 18 / 20 / 22.

## Notes about the spec

A couple of small ambiguities in the spec, with the interpretation used here:

- **`BAD-ID`**: the spec says "the id is `BAD-ID`" but the fixture uses `BAD-ID-*` (e.g. `BAD-ID-v5ne1g`). The implementation treats `BAD-ID` as a **prefix**.
- **HTML stripping**: the spec lists exactly four tags (`<b>`, `</b>`, `<i>`, `</i>`). The fixture also contains `<span>` tags in some names. Per the spec, only the four listed tags are stripped — `<span>` is left alone.
- **Second URL**: the brief mentions two URLs (one corrupted, one "all invalid") but only the corrupted URL was provided. The same pipeline handles both — an all-invalid input simply produces an empty `output.json` and inflates the `invalidSkipped` counter.
