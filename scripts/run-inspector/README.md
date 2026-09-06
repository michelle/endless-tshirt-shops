# Durable run inspector

One entry point replaces repeated transcript parsing, API-list scripts, image-stat scripts and report assembly. It inspects committed artifacts without checking out or executing generated applications. Requires Node 20.11+, Git and tar. Artwork inspection also needs Python 3 and `pip install -r scripts/run-inspector/requirements.txt` (use your usual virtual environment).

## Basic workflow

```sh
git fetch origin benchmark-results
node scripts/run-inspector/inspect.mjs \
  --suite 20260906-clean-sheet-high --expected-runs 7
```

The default ref is `origin/benchmark-results`; `--ref <commit-or-ref>` pins another input. The inspector resolves it once to a commit, validates suite/run identities, and excludes symlinks, submodules and generated dependency directories. `--expected-runs` is optional: omit it or adjust the count for suites with retries.

Default output is a new, private, Git-ignored directory:

```text
.benchmark-secrets/inspections/<suite>/<timestamp-nonce>/
  artifacts/runs/<run>/     immutable source/final/transcript snapshot
  private-snapshot.json    raw API evidence; can contain customer data and signed URLs
  inspection.json          structured, review-required evidence (schemaVersion 1)
  summary.generated.md     reusable Markdown evidence section
  artwork/                 optional exact images, thumbnails and proof.html
  viewer-stage/            optional captures and import-plan.json
```

`--output <new-private-directory>` overrides the destination. Existing destinations are rejected; nothing is silently overwritten. Keep the entire directory private. Even the filtered report and viewer staging require human review before publication; archived source and final answers are not PII-sanitized. Raw transcripts and API snapshots have no automatic retention expiry.

## Stripe / Prodigi evidence

```sh
node scripts/run-inspector/inspect.mjs --suite SUITE --expected-runs 7 --live
```

Uses `.benchmark-secrets/stripe/<run-id>.toml`; override with `--profiles <directory>` when the suite ran in another worktree. Prodigi uses the environment's `PRODIGI_API_KEY`. Only test credentials are accepted. Do not put credentials on the command line or in an artwork plan.

Only fixed Stripe and Prodigi sandbox GET endpoints are queried. Stripe sessions, intents, customers, events and webhook endpoints and Prodigi orders are paginated. HTTP errors, page limits, missing cursors and missing credentials produce incomplete coverage, not an empty successful audit. Restricted Stripe keys may deny `/v1/account`; the profile's account ID does not substitute for live identity verification. Later API observations are timestamped and are not historical run-time proof.

Replay a previously collected snapshot without API collection:

```sh
node scripts/run-inspector/inspect.mjs --suite SUITE \
  --snapshot /private/path/private-snapshot.json
```

Do not combine `--snapshot` and `--live`. A snapshot must have `schemaVersion: 1`, the matching `suiteId`, `observedAt`, a `runs` map keyed by full run IDs, and the collector's `prodigi` object. Prefer inspector-produced snapshots rather than manually assembling them.

Isolation checks cover shared credentials/account identities, profile paths, Vercel projects/origins, cross-run Stripe objects, foreign webhook origins, state predating run start, cross-linked Prodigi receipts, source references to sibling runs, and matching prompt/base/effort metadata. Missing coverage is unknown. Prodigi is intentionally one shared sandbox account. This detects evidence of contamination within the inspected suite; it cannot prove absence of arbitrary shared ambient state. Source hits are review cues, not automatic conclusions about application behavior.

## Documentation evidence

New adapters save full private incremental JSONL envelopes with sequence, receipt time, stream and native event. Public `events.jsonl` records have schema version 1, call IDs, lifecycle status, evidence sequence, tool classification, topic tags, safe documentation URL paths and hashed query/topic records. Raw commands, arguments, queries and results stay private. `capture.json` states coverage and limitations.

The inspector distinguishes searches, requested documents, local reference reads, API interactions, incomplete calls and failed calls. Search counts are individual query requests; reference counts are tool calls, not unique pages. `tool_result_available` means output was captured, not that it was a useful document. Codex exec web events sometimes omit result bodies and resolved URLs. Shell classification is heuristic and can miss dynamic URLs or mixed write/read commands. Local bundled Next/Stripe guides count as local references, not web lookups.

Old Codex JSON logs can be inspected. Old Claude final-result-only logs cannot establish documentation use; they report unknown. No transcript can prove whether an implementation relied on training data, understood a page, or was influenced by a lookup. Do not turn zero observed searches into that claim.

## Exact artwork recovery

Create a private JSON array selecting evidence already identified during review:

```json
[
  {"runId":"SUITE-codex-sol", "kind":"paid-order", "orderId":"ord_123", "itemIndex":0, "assetIndex":0},
  {"runId":"SUITE-claude-sonnet-5", "kind":"direct", "name":"submitted", "orderId":"ord_456"}
]
```

```sh
node scripts/run-inspector/inspect.mjs --suite SUITE \
  --snapshot /private/path/private-snapshot.json \
  --artwork /private/path/artwork-plan.json
```

Supported `kind` values:

- `paid-order`: an exact Prodigi asset linked unambiguously to a paid Stripe object in this run. **Still review whether the app's customer checkout produced it.** Synthetic paid objects can otherwise look convincing.
- `hosted-unpaid`: requires `sessionId` of a real unpaid Session with metadata, and a reviewed `url`. Verify that the URL/inputs correspond to that Session; the tool cannot infer application semantics.
- `synthetic` / `direct`: explicitly separate test submissions. Supply an order ID or reviewed URL. Defaults to `submitted`, never silently replaces the customer design.
- `local`: requires `file`, a regular image file. Recovery does not execute archived code. Record any reproduction steps in the human summary; this is not payment/fulfillment evidence.

`name` may be `design` or `submitted`; duplicate selections are rejected. Downloads only permit this run's deployment or the configured Prodigi thumbnail host, reject redirects and known checkout/order/fulfillment routes, and enforce size limits. Optional artwork fetching and browser capture still use the network even with `--snapshot`; omit both flags for wholly offline replay. Review arbitrary asset URLs before requesting them: GET cannot guarantee a badly implemented application has no side effects.

Original bytes, canvas and alpha are preserved. The report records SHA-256/MD5, dimensions, alpha bounds, pixel counts, exact SKU/print-area/sizing attributes when present, and whether Prodigi's asset hash matches. Thumbnails are separate evidence. `artwork/proof.html` displays originals on a changeable background without modifying them. Neither it nor the inspector invents physical garment positioning: product print-area dimensions and the app's sizing/placement logic still require review. SVGs and unsupported raster formats fail rather than being silently rasterized.

## Viewer staging and summary updates

`--capture` reuses the existing viewer screenshot/favicon/social-preview capture implementation. Install its dependencies first (`cd run_viewer && npm ci && npx playwright install chromium`). It captures current storefront homepages with the standard viewport; it never fills checkout forms. Runs without a deployment and failed captures are reported. `CAPTURE_BROWSER=chrome` uses installed Chrome instead.

The private `viewer-stage/public/suites/<suite>/` contains verbatim final answers, selected artwork and capture manifests/assets. `import-plan.json` maps full benchmark IDs to the existing seven short model IDs; retries retain unique full IDs. This is staging only: it does not edit `app/data.ts`, replace existing permalink IDs, invent ratings, or publish anything. Review source URLs, final answers, images, capture errors and privacy before copying selected assets into the viewer. A reviewed summary must also be supplied; no generated evidence-only summary is silently installed as the suite's final audit.

```sh
node scripts/run-inspector/inspect.mjs --suite SUITE \
  --update-summary run_viewer/public/suites/SUITE/summary.md
```

This explicit flag appends or refreshes only the block between `<!-- run-inspector:v1:start -->` and `<!-- run-inspector:v1:end -->`. It preserves all human-written content outside the block and existing headings. Malformed or duplicate markers abort the update. Keep editorial findings and scoring outside the generated block. Review the diff, then run `cd run_viewer && npm run predeploy` before publishing viewer changes.

## Tests

```sh
node --test tests/run-inspector.test.mjs tests/adapter-capture.test.mjs tests/run-suite.test.mjs
bash tests/run-benchmark-test.sh
```

These use local fixtures/fake CLIs and mocked API responses. No paid model calls or real orders. Tests cover native stream lifecycle handling, interrupted capture, final-result separation, query privacy, pagination, restricted credentials, isolation failures/unknowns, exact artwork bytes, summary preservation, short viewer IDs, and a complete offline Git-artifact inspection. Existing viewer tests remain responsible for rendered UI, permalink compatibility and predeployment asset availability.
