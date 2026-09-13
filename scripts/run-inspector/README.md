# Run inspector

One entry point for auditing a finished suite: transcript parsing, sandbox API
evidence, image statistics and report assembly. It reads committed artifacts and
never checks out or executes a generated application.

Needs Node 20.11+, Git and tar; artwork inspection also needs Python 3 with
`pip install -r requirements.txt`.

```sh
git fetch origin benchmark-results
node scripts/run-inspector/inspect.mjs --suite 20260911-prompt-v3-high --expected-runs 7
```

Output goes to a new private, Git-ignored directory:

```text
.benchmark-secrets/inspections/<suite>/<timestamp-nonce>/
  artifacts/runs/<run>/    immutable source, report and event snapshot
  inspection.json          structured evidence (schemaVersion 1), review required
  summary.generated.md     the same evidence as a reusable Markdown section
  private-snapshot.json    raw API responses; may hold customer data and signed URLs
  artwork/                 with --artwork: exact images, thumbnails, proof.html
  viewer-stage/            with --capture: screenshots and an import plan
```

`--ref` pins a different input ref (default `origin/benchmark-results`), and it
is resolved to a commit once, so a concurrent push cannot change the inspection
mid-run. `--output` chooses the destination; an existing one is refused, so
nothing is silently overwritten. `--expected-runs` is optional — omit or adjust
it for suites with retries. Symlinks, submodules and dependency directories are
excluded.

**Keep the whole directory private.** Even the filtered report and the viewer
staging need human review before publication: archived source and final answers
are not PII-sanitized, and nothing here expires automatically.

## What it can and cannot tell you

The inspector reports evidence, not verdicts. It does not launch runs, execute
archived code, create payments or orders, score runs, or publish anything.
Three limits are worth stating up front, because the report repeats them:

- **Missing coverage is `unknown`, never a pass or a zero.** HTTP errors, page
  limits, missing cursors and absent credentials all produce incomplete
  coverage. Restricted Stripe keys may deny `/v1/account`, and the profile's own
  account ID is not a substitute for live identity.
- **A lookup is not comprehension.** No transcript can show whether an
  implementation relied on training data, understood a page, or was influenced
  by a search. Do not turn zero observed searches into that claim.
- **Live observations are later snapshots.** They are timestamped when
  collected, and are not proof of what was true while the run executed.

## Payment and fulfillment evidence

```sh
node scripts/run-inspector/inspect.mjs --suite SUITE --expected-runs 7 --live
```

Queries only fixed Stripe and Prodigi sandbox GET endpoints, using the saved
profile at `.benchmark-secrets/stripe/<run-id>.toml` (override the directory
with `--profiles`) and `PRODIGI_API_KEY`. Test credentials only. Never put
credentials on the command line or in an artwork plan.

Replay a collected snapshot instead of calling the APIs with
`--snapshot <file>`; it cannot be combined with `--live`. Prefer
inspector-produced snapshots over hand-assembled ones.

Isolation checks cover shared credentials and account identities, profile paths,
Vercel projects and origins, cross-run Stripe objects, foreign webhook origins,
state predating the run, cross-linked Prodigi receipts, source references to
sibling runs, and agreement of prompt, base commit and effort across the suite.
A demonstrated divergence is a failure even when another run is missing the same
field. Prodigi is intentionally one shared sandbox account. Source hits are
review cues, not conclusions about behaviour.

## Documentation evidence

Public `events.jsonl` records carry call IDs, lifecycle status, tool
classification, topic tags, allowlisted documentation URL paths and hashed
queries. Raw commands, arguments, queries and results stay private.

Search counts are individual query requests; reference counts are tool calls,
not unique pages. `tool_result_available` means output was captured, not that it
was a useful document. Shell classification is heuristic and can miss dynamic
URLs or mixed read/write commands. Docs bundled in `node_modules` count as local
references, not web lookups. Codex exec web events sometimes omit result bodies
and resolved URLs. Old Claude final-result-only logs report `unknown` rather
than zero.

## Artwork recovery

Selections are explicit, reviewed, and recorded with their provenance. Write a
private JSON array:

```json
[
  {"runId": "SUITE-codex-sol", "kind": "paid-order", "orderId": "ord_123", "itemIndex": 0, "assetIndex": 0},
  {"runId": "SUITE-claude-sonnet-5", "kind": "direct", "name": "submitted", "orderId": "ord_456"}
]
```

```sh
node scripts/run-inspector/inspect.mjs --suite SUITE \
  --snapshot /private/path/private-snapshot.json \
  --artwork /private/path/artwork-plan.json
```

| `kind` | Requires | Means |
| --- | --- | --- |
| `paid-order` | An asset unambiguously linked to one paid Stripe object in this run | The exact bytes Prodigi fetched. **Still review whether the app's checkout produced it** — a synthetic paid object can look convincing. |
| `hosted-unpaid` | `sessionId` of a real unpaid Session with metadata, plus a reviewed `url` | Intended artwork recorded at checkout; no payment, no fulfillment. |
| `synthetic` / `direct` | An order ID or reviewed URL | A separate test submission. Defaults to the name `submitted`, never replacing the customer design. |
| `local` | `file`, a regular image | A reproduction. Not payment or fulfillment evidence; record the steps in the human summary. |

Downloads are restricted to this run's deployment or the Prodigi thumbnail host,
reject redirects and known checkout/order/fulfillment routes, and enforce a size
limit. Review any asset URL before requesting it: a GET cannot guarantee that a
badly implemented application has no side effects. Artwork fetching and browser
capture still use the network even with `--snapshot`; omit both for a fully
offline replay.

Original bytes, canvas and alpha are preserved. The report records SHA-256 and
MD5, dimensions, alpha bounds, pixel counts, SKU and print-area attributes where
present, and whether Prodigi's asset hash matches. `artwork/proof.html` shows
the originals on a changeable background without modifying them. Neither it nor
the inspector infers physical garment placement. Unsupported formats fail rather
than being silently rasterized.

## Viewer staging and summary updates

`--capture` reuses the viewer's own capture code (install its dependencies
first: `cd run_viewer && npm ci && npx playwright install chromium`). It stages
verbatim final answers, selected artwork and capture manifests under
`viewer-stage/`, with an `import-plan.json` mapping full run IDs to the seven
short viewer IDs. Staging only: it does not edit `app/data.ts` or publish. Review sources, reports, images and privacy before copying anything
across.

```sh
node scripts/run-inspector/inspect.mjs --suite SUITE \
  --update-summary run_viewer/public/suites/SUITE/summary.md
```

This refreshes only the block between `<!-- run-inspector:v1:start -->` and
`<!-- run-inspector:v1:end -->`, preserving everything a human wrote outside it.
Malformed or duplicate markers abort the update. Keep editorial findings and
scoring outside the generated block. Review the diff, then run
`cd run_viewer && npm run predeploy` before publishing viewer changes.

## Tests

```sh
node --test tests/run-inspector.test.mjs tests/adapter-capture.test.mjs tests/run-suite.test.mjs
bash tests/run-benchmark-test.sh
```

Local fixtures, fake CLIs and mocked API responses; no paid model calls or real
orders.
