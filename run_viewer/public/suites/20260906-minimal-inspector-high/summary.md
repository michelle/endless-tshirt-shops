# Seven-model minimal benchmark — 2026-09-06 (inspector run)

## Results at a glance

All seven model executions completed with high reasoning. Completion means the agent stopped successfully, not that the storefront passed. Reviewed artifact ref: `f872593d9fd4647bfb9ab4d39dcd3084a23c04f3`. Original input base: `4bc4cd4b59f6f5bbab4b9df6a26f480d02c0b40d`. API evidence was observed on September 7, 2026 UTC; captures are later observations of deployed storefronts.

**Isolation failed:** Astra's saved Stripe credential can see an enabled webhook targeting Terra's storefront. Terra's own saved profile contains no test key. Three later unpaid Sessions on Astra's account have Terra's test timestamp and metadata shape, unlike Astra's product-tagged Sessions. Do not treat these two runs as independent Stripe experiments or attribute all five Sessions to Astra. The inspector flags the webhook; source/timing review supplies the cross-run interpretation. Restricted keys deny live account identity checks, so remaining identity coverage is unknown, not proven clean.

| Model | Timestamp-only print | Customer checkout | Prodigi | Color |
| --- | --- | --- | --- | --- |
| Astra | Fail | Unverified | Unverified | Red — 0/3 |
| Sol | Fail | Unverified | Unverified | Red — 0/3 |
| Terra | Pass | Unverified | Unverified | Red — 1/3 |
| Luna | Fail | Pass | Pass | Yellow — 2/3 |
| Fable | Pass | Pass | Pass | Green — 3/3 |
| Opus | Pass | Pass | Pass | Green — 3/3 |
| Sonnet | Fail | Pass | Fail | Red — 1/3 |

Green requires all three checks; yellow requires two. Unknown does not count as a pass. These are benchmark integration checks, **not launch certification**: no physical garments were printed or inspected, and paid-flow passes do not assert that every wallet, variant or failure path works.

## Good and launch blockers

### Astra

Good: transparent canvas, bundled font outlines, explicit payment/product/amount guards, current shipping extraction and body-level Prodigi idempotency. Both garment cuts were exercised in standalone tests.

Blockers: the exact fetched artwork cuts off the final digits of timestamp 1788736607966. The truncation is inside the original canvas, not caused by viewer framing, and its MD5 matches Prodigi's submitted asset. Its product-tagged Checkout Sessions remain unpaid. The separate succeeded PaymentIntent and smoke orders are not proof of hosted checkout. The account also contains Terra's webhook and later test Sessions, invalidating isolation. Fix the actual raster output, resolve account separation and demonstrate the original customer checkout before promoting the integration checks.

### Sol

Good: current Checkout shipping-field handling, signed artwork URLs, paid-state guard and body idempotency are present.

Blockers: the deployed timestamp is effectively invisible: only **754 nontransparent pixels** on a 4665×5844 canvas, with a 129×12-pixel text bounding box. The SVG requests 300px type, but that is not what the deployed raster contains; do not score source intent instead of actual output. Both Sessions are unpaid and no PaymentIntents exist. Order `ord_1170762` is a direct API test, not app fulfillment. Capture also reported a React hydration error.

### Terra

Good: readable timestamp-only transparent artwork; distinct fitted and unisex SKU choices; body idempotency and a paid-state guard. The shipping code reads `collected_information.shipping_details` first, so the inspector's legacy-field hit is a fallback, not evidence of the earlier legacy-only bug.

Blockers: no independent Stripe profile credential and a webhook on Astra's account. The recorded garment submissions are standalone API tests. Customer payment and fulfillment are unverified. Capture reported a React hydration error.

### Luna

Good: succeeded app-shaped PaymentIntents, app fulfillment metadata and completed fitted/L order `ord_1170769` agree. Current code uses PaymentIntent shipping and body idempotency; fitted/unisex map to Bella + Canvas 6004/3001.

Blockers: actual artwork contains tiny timestamp, date, fit and branding, not timestamp-only print. Only **4,636 pixels** have nonzero alpha on the full canvas. Earlier unisex assets remain in error; a successful final fitted order does not erase them. Capture reported a React hydration error. The audit did not independently repeat browser card entry.

### Fable

Good: readable timestamp-only artwork with bundled Chivo, matching paid unisex/L order `ord_1170778`, current PaymentIntent shipping, and body idempotency shared by webhook and browser fallback. The archived browser-purchase script and model report support the app flow; live payment/order evidence corroborates it.

Before launch: physical scale/placement needs a sample; earlier failed asset orders need operational handling. The final answer says the sandbox never downloads artwork, but this observation contains completed assets with matching source hashes and thumbnails. Treat the final answer as the model's claim, not ground truth. Wallets, taxes, receipts and account expiry still require attention.

### Opus

Good: readable 4680×5790 timestamp-only canvas, matching paid fitted/M order `ord_1170792`, body idempotency, authorization-then-capture, and a canceled failure-test payment. Latest source bytes match the completed asset. The model's browser-test report is corroborated by payment/order records; this audit did not replay those gestures.

Before launch: earlier failed-asset orders still exist. Acceptance/capture is not a guarantee of later asset processing success. Durable operational retries, real abuse protection, wallet validation, receipts and physical samples remain outstanding. The latest successful path is scored separately from those earlier failure tests.

### Sonnet

Good: paid app PaymentIntents triggered completed orders, including `ord_1170804`; artwork is publicly fetchable and transparent.

Blockers: artwork includes an ISO-date subtitle beyond the raw timestamp. Two earlier payments each generated duplicate orders (`1170797/1170798` and `1170799/1170800`). Final code adds a best-effort Stripe-metadata claim, but read-then-write is not atomic and the Prodigi request still omits `idempotencyKey`. Therefore the claim that duplicate ordering was fixed is not sufficient for a pass. “Fitted” maps to Gildan 64000 Softstyle, not a women's fitted SKU; validate that product promise explicitly.

## Design correctness and print proof

The viewer archives **original downloaded bytes**, preserving transparency, full canvas and relative artwork position. All seven selected originals match the MD5 stored by Prodigi. That proves which bytes were fetched, not correct physical placement or successful customer checkout. White ink should be inspected on a dark T-shirt background.

| Model | Displayed source | Garment / front sizing | What it proves |
| --- | --- | --- | --- |
| Astra | `ord_1170757` | Bella + Canvas 3001, black/M, fitPrintArea | Direct test uses the same timestamp and fit as an unpaid Astra app Session; not paid checkout |
| Sol | `ord_1170762` | Bella + Canvas 6004, black/M, fitPrintArea | Direct test using the deployed signed customer renderer; not a customer order |
| Terra | `ord_1170764` | Gildan 64000L, black/M, fillPrintArea | Direct fitted test using the deployed customer renderer |
| Luna | `ord_1170769` | Bella + Canvas 6004, black/L, fitPrintArea | Paid app-linked final fitted order, asset Complete |
| Fable | `ord_1170778` | Bella + Canvas 3001, black/L, fitPrintArea | Paid app-linked unisex order, asset Complete |
| Opus | `ord_1170792` | Bella + Canvas 6004, black/M, fitPrintArea | Paid app-linked fitted order, asset Complete |
| Sonnet | `ord_1170804` | Gildan 64000, black/M, fitPrintArea | Paid app-linked order; does not resolve duplicate risk |

Sol's direct test uses fitted/M; the same timestamp's unpaid Session is unisex/L. The renderer draws only the timestamp, but the test must not be described as that customer's garment order. No social image, guessed timestamp, or locally repaired artwork substitutes for any original here. Garment inches cannot be inferred just from PNG dimensions or DPI metadata. The displayed frame preserves the submitted canvas; it is not a validated physical-shirt mockup.

## Storefront captures and social previews

All seven storefront homepages returned HTTP 200 and were captured above the fold at 1440×900. Favicons were found for Astra, Sol, Fable, Opus and Sonnet; none were declared/recovered for Terra or Luna. Only Opus exposed a recoverable social-preview image. Missing previews are explicitly marked missing, not recreated. Sol, Terra and Luna produced React hydration errors during capture.

## Documentation evidence and limits

The reusable inspector section below records searches, document requests, local reference reads, source complexity, payment observations and isolation. All seven used Next/React; recorded dependencies are source declarations, not proof of exact resolved or deployed versions.

Coverage is partial, including the new adapters. Zero observed lookups is **not** evidence that a model relied exclusively on training data. Search requests do not prove a page was read or understood. Astra's runtime line count includes substantial scaffold/UI code; these counts are not a measure of correctness or useful work.

## Token usage

Adapter-reported usage, not an independent billing reconciliation. “New input” excludes cache reads and includes Claude cache creation; output counters are provider-reported and should not be treated as identical work across providers. No dollar-cost estimate is inferred.

| Model | New input tokens | Cached input / cache reads | Output tokens |
| --- | --- | --- | --- |
| Astra | 150,212 | 4,101,120 | 31,402 |
| Sol | 177,130 | 15,113,216 | 54,343 |
| Terra | 135,467 | 3,645,824 | 20,978 |
| Luna | 165,659 | 6,504,448 | 35,446 |
| Fable | 167,250 | 8,963,498 | 93,959 |
| Opus | 271,213 | 21,731,226 | 167,734 |
| Sonnet | 259,428 | 24,338,694 | 111,654 |

## Publication and privacy

Astra's original artifact publication was recovered after whitespace warnings; model execution was not repeated. Sonnet also finished successfully, but the scanner blocked a nonfunctional build-time placeholder. Its archived fallback string was redacted with an explicit publication note; the deployed application was not changed and the private original is retained. Final answers are model claims, with sandbox-claim capabilities/private links redacted in viewer copies. Raw transcripts, credentials, signed artwork URLs, recipient records and API snapshots remain private.

The inspector's generated payment table groups observations by saved profile. In this suite, that means Astra's row includes the contaminated account state described above; it is not an attribution of every object to Astra.

<!-- run-inspector:v1:start -->
## Automated inspection evidence

Snapshot: 2026-09-07T04:14:28.033Z. Suite: `20260906-minimal-inspector-high`. Artifact ref: `f872593d9fd4647bfb9ab4d39dcd3084a23c04f3`. Inspector: `1.0.0`.

This is generated evidence, not a reviewed pass/fail rating. Searches do not prove reading or training-data reliance; paid Stripe objects do not prove the customer checkout flow. Live observations are later snapshots, not historical run-time evidence.

### Run and framework evidence

| Model | Run status | Seconds | Framework dependencies | Runtime files / lines | Verification files / lines |
| --- | --- | --- | --- | --- | --- |
| gpt-6-astra | succeeded | 1192 | next@^16.3.4, react@^19.2.8, react-day-picker@9.8.1, react-dom@^19.2.8, react-resizable-panels@4.5.8, react-server-dom-webpack@^19.2.8, sharp@^0.35.4, stripe@^22.6.1 | 83 / 9579 | 4 / 339 |
| gpt-5.6-sol | succeeded | 1569 | next@16.3.4, react@19.1.1, react-dom@19.1.1, sharp@0.35.4, stripe@18.5.0 | 17 / 1066 | 1 / 13 |
| gpt-5.6-terra | succeeded | 724 | next@^15.2.4, react@^19.0.0, react-dom@^19.0.0, stripe@^17.7.0 | 8 / 337 | 0 / 0 |
| gpt-5.6-luna | succeeded | 1006 | @stripe/react-stripe-js@3.9.0, @stripe/stripe-js@7.9.0, next@16.3.4, react@19.2.8, react-dom@19.2.8, sharp@0.35.4, stripe@22.6.1 | 15 / 640 | 0 / 0 |
| claude-fable-5-1 | succeeded | 1848 | @stripe/react-stripe-js@^6.9.0, @stripe/stripe-js@^9.15.0, next@^16.3.4, react@^19.2.8, react-dom@^19.2.8, stripe@^22.6.1 | 20 / 1870 | 3 / 106 |
| claude-opus-5 | succeeded | 3835 | @stripe/react-stripe-js@^6.9.0, @stripe/stripe-js@^9.15.0, next@^16.3.4, react@^19.2.8, react-dom@^19.2.8, stripe@^22.6.1 | 21 / 2710 | 0 / 0 |
| claude-sonnet-5 | succeeded | 2206 | @stripe/react-stripe-js@^6.9.0, @stripe/stripe-js@^9.15.0, next@16.3.4, react@19.2.8, react-dom@19.2.8, stripe@^22.6.1 | 21 / 1224 | 0 / 0 |

### Documentation-use evidence

Search counts are individual query requests. Reference requests/reads count tool calls, not unique pages. A returned tool result can be an error page or snippet; it is not proof of successful document retrieval. Raw queries, commands and tool outputs remain private.

| Model | Topic | Coverage | Search queries | Document requests | Local reference calls | Reference results available |
| --- | --- | --- | --- | --- | --- | --- |
| gpt-6-astra | stripe | observed_partial | 2 | 3 | 0 | 0 |
| gpt-6-astra | prodigi | observed_partial | 5 | 4 | 0 | 0 |
| gpt-6-astra | framework | observed_partial | 0 | 2 | 2 | 2 |
| gpt-5.6-sol | stripe | observed_partial | 1 | 1 | 2 | 3 |
| gpt-5.6-sol | prodigi | observed_partial | 2 | 13 | 5 | 17 |
| gpt-5.6-sol | framework | observed_partial | 0 | 3 | 1 | 4 |
| gpt-5.6-terra | stripe | observed_partial | 1 | 0 | 0 | 0 |
| gpt-5.6-terra | prodigi | observed_partial | 6 | 0 | 0 | 0 |
| gpt-5.6-terra | framework | observed_partial | 0 | 0 | 0 | 0 |
| gpt-5.6-luna | stripe | observed_partial | 1 | 0 | 0 | 0 |
| gpt-5.6-luna | prodigi | observed_partial | 4 | 0 | 0 | 0 |
| gpt-5.6-luna | framework | observed_partial | 1 | 0 | 0 | 0 |
| claude-fable-5-1 | stripe | observed_partial | 0 | 0 | 1 | 1 |
| claude-fable-5-1 | prodigi | observed_partial | 0 | 0 | 0 | 0 |
| claude-fable-5-1 | framework | observed_partial | 0 | 0 | 0 | 0 |
| claude-opus-5 | stripe | observed_partial | 0 | 0 | 2 | 2 |
| claude-opus-5 | prodigi | observed_partial | 0 | 1 | 0 | 1 |
| claude-opus-5 | framework | observed_partial | 0 | 0 | 0 | 0 |
| claude-sonnet-5 | stripe | observed_partial | 0 | 0 | 0 | 0 |
| claude-sonnet-5 | prodigi | observed_partial | 3 | 5 | 0 | 5 |
| claude-sonnet-5 | framework | observed_partial | 0 | 0 | 2 | 2 |

### Payment and fulfillment observations

| Model | Stripe evidence | Sessions / paid | PaymentIntents / succeeded | Linked Prodigi orders |
| --- | --- | --- | --- | --- |
| gpt-6-astra | Lists complete | 5 / 0 | 1 / 1 | None observed; check coverage |
| gpt-5.6-sol | Lists complete | 2 / 0 | 0 / 0 | None observed; check coverage |
| gpt-5.6-terra | No test key in saved profile | unknown | unknown | None observed; check coverage |
| gpt-5.6-luna | Lists complete | 0 / 0 | 6 / 4 | ord_1170769: paid-stripe-object-linked; ord_1170768: paid-stripe-object-linked; ord_1170767: paid-stripe-object-linked |
| claude-fable-5-1 | Lists complete | 0 / 0 | 8 / 6 | ord_1170789: paid-stripe-object-linked; ord_1170778: paid-stripe-object-linked; ord_1170777: paid-stripe-object-linked; ord_1170776: paid-stripe-object-linked; ord_1170773: paid-stripe-object-linked; ord_1170772: paid-stripe-object-linked |
| claude-opus-5 | Lists complete | 0 / 0 | 25 / 8 | ord_1170792: paid-stripe-object-linked; ord_1170790: paid-stripe-object-linked; ord_1170788: unpaid-stripe-object-linked; ord_1170787: paid-stripe-object-linked; ord_1170786: paid-stripe-object-linked; ord_1170783: paid-stripe-object-linked; ord_1170782: paid-stripe-object-linked; ord_1170781: paid-stripe-object-linked; ord_1170780: paid-stripe-object-linked |
| claude-sonnet-5 | Lists complete | 0 / 0 | 27 / 4 | ord_1170804: paid-stripe-object-linked; ord_1170803: paid-stripe-object-linked; ord_1170800: paid-stripe-object-linked; ord_1170799: paid-stripe-object-linked; ord_1170798: paid-stripe-object-linked; ord_1170797: paid-stripe-object-linked |

### Isolation evidence

Overall: **fail**. Observed suite only; not proof of absence of all ambient-state contamination. The Prodigi sandbox is intentionally shared. Missing evidence never establishes account separation.

| Check | State | Runs | Evidence |
| --- | --- | --- | --- |
| run IDs | pass |  | Distinct across inspected runs |
| Vercel project names | pass |  | Distinct across inspected runs |
| deployment origins | pass |  | Distinct across inspected runs |
| Stripe profile paths | pass |  | Distinct across inspected runs |
| Stripe account identities | unknown |  | Some identities unavailable |
| Stripe credentials | unknown |  | Some identities unavailable |
| consistent suite_id | pass |  | Compare immutable run metadata |
| consistent prompt_sha256 | pass |  | Compare immutable run metadata |
| consistent base_commit | pass |  | Compare immutable run metadata |
| consistent reasoning_effort | pass |  | Compare immutable run metadata |
| profile/account agreement | unknown | 20260906-minimal-inspector-high-codex-gpt-6-astra | Live GET /v1/account versus saved profile identity |
| webhook destination | fail | 20260906-minimal-inspector-high-codex-gpt-6-astra | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20260906-minimal-inspector-high-codex-gpt-6-astra | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260906-minimal-inspector-high-codex-gpt-5.6-sol | Live GET /v1/account versus saved profile identity |
| webhook destination | pass | 20260906-minimal-inspector-high-codex-gpt-5.6-sol | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20260906-minimal-inspector-high-codex-gpt-5.6-sol | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260906-minimal-inspector-high-codex-gpt-5.6-terra | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260906-minimal-inspector-high-codex-gpt-5.6-terra | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260906-minimal-inspector-high-codex-gpt-5.6-terra | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260906-minimal-inspector-high-codex-gpt-5.6-luna | Live GET /v1/account versus saved profile identity |
| webhook destination | pass | 20260906-minimal-inspector-high-codex-gpt-5.6-luna | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20260906-minimal-inspector-high-codex-gpt-5.6-luna | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260906-minimal-inspector-high-claude-claude-fable-5-1 | Live GET /v1/account versus saved profile identity |
| webhook destination | pass | 20260906-minimal-inspector-high-claude-claude-fable-5-1 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20260906-minimal-inspector-high-claude-claude-fable-5-1 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260906-minimal-inspector-high-claude-claude-opus-5 | Live GET /v1/account versus saved profile identity |
| webhook destination | pass | 20260906-minimal-inspector-high-claude-claude-opus-5 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20260906-minimal-inspector-high-claude-claude-opus-5 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260906-minimal-inspector-high-claude-claude-sonnet-5 | Live GET /v1/account versus saved profile identity |
| webhook destination | pass | 20260906-minimal-inspector-high-claude-claude-sonnet-5 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20260906-minimal-inspector-high-claude-claude-sonnet-5 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| cross-run Prodigi receipts | unknown |  | A single order must not be linked to Stripe objects from different runs |
| cross-run Stripe objects | unknown |  | Repeated object IDs across run profiles |
| cross-run source references | pass |  | Static source contains another inspected run ID or deployment; review hits before attribution |
| Prodigi account separation | shared |  | Harness intentionally supplies one shared Prodigi sandbox credential; orders are not account-isolated |

### Artwork evidence

No artwork is reconstructed or executed automatically. Reviewed selections preserve original bytes and canvas. Pixel statistics and a matching hash alone do not establish printable quality.

| Run | Source class | Canvas | Nontransparent pixels | Bounds | Prodigi hash match |
| --- | --- | --- | --- | --- | --- |
| 20260906-minimal-inspector-high-codex-gpt-6-astra | direct | 4677×5881 | 146180 | [1153,931,3268,1154] | true |
| 20260906-minimal-inspector-high-codex-gpt-5.6-sol | direct | 4665×5844 | 754 | [2268,1412,2397,1424] | true |
| 20260906-minimal-inspector-high-codex-gpt-5.6-terra | direct | 2480×3507 | 39646 | [695,1696,1805,1821] | true |
| 20260906-minimal-inspector-high-codex-gpt-5.6-luna | paid-order | 4677×5787 | 4636 | [2014,2807,2668,3459] | true |
| 20260906-minimal-inspector-high-claude-claude-fable-5-1 | paid-order | 2490×3510 | 88621 | [371,654,2118,806] | true |
| 20260906-minimal-inspector-high-claude-claude-opus-5 | paid-order | 4680×5790 | 246242 | [1147,895,3542,1117] | true |
| 20260906-minimal-inspector-high-claude-claude-sonnet-5 | paid-order | 1500×1800 | 77376 | [87,777,1386,1062] | true |

### Review required

- Confirm payment-to-app-to-order provenance, variant/SKU mapping, artwork intent and physical print scale.
- Inspect artwork on dark and light backgrounds and compare fetched Prodigi thumbnails.
- Review source cues and capture gaps in inspection.json. No source cue is an automatic launch-blocker finding.
- Review retry/idempotency, paid-state guards, deployment environment configuration and cross-run references.
- Do not publish private snapshots, transcripts, profile files, signed source URLs or raw customer records.
<!-- run-inspector:v1:end -->
