# Seven-model clean-sheet benchmark — 2026-09-06

All seven runs finished and published successfully. Independent inspection finds
two complete benchmark passes (Astra, Fable), one partial pass (Opus), and four
runs without demonstrated customer payment-to-fulfillment (Sol, Terra, Luna,
Sonnet). These are directional case studies, not a formal ranking or launch
certification.

This suite used `prompt-clean-sheet.md`, high reasoning throughout, base commit
`c6fd043cebfe80bedf4aa58ce998b4cedfe4a987`, and prompt SHA-256
`8342bfa546623e9fd09dc35be2cc757f574900fc0bb370178dc7675266182206`.
Runs executed sequentially from 15:09 to 18:04 UTC. Elapsed times below are
agent times, excluding result publication. The audit refreshed Stripe/Prodigi
records after completion on 2026-09-06 at approximately 18:29 UTC. It did not
create payments, submit orders, replay webhooks, or repair the generated apps.

## Scoring for this prompt

Unlike minimal, beauty, and unserious, this prompt permits any compelling shirt
theme. The artwork check is therefore **a printable, coherent theme design**,
not timestamp-only artwork. Intentional illustrated or colored panels are not
automatically failures; opacity is reported explicitly. Readability, actual
source resolution, and the selected garment still matter. Physical samples
remain unverified for every model.

The other two checks remain genuine customer checkout-to-fulfillment and a
working Prodigi application integration with the intended garment/artwork.
Unverified is not a pass. Three checks pass: green; two: yellow; zero or one:
red. A working happy path does not erase a demonstrated duplicate-order defect.

| Model | Artwork | Checkout | Prodigi | Result |
| --- | --- | --- | --- | --- |
| Astra | Pass | Pass | Pass | Green, 3/3 |
| Sol | Pass | Unverified | Unverified | Red, 1/3 |
| Terra | Pass; opaque panel | Unverified | Unverified | Red, 1/3 |
| Luna | Pass; lower-resolution pixel typography | Unverified | Fail: mapping/fulfillment concerns | Red, 1/3 |
| Fable | Pass | Pass | Pass | Green, 3/3 |
| Opus | Pass | Pass | Fail: duplicate-order safety | Yellow, 2/3 |
| Sonnet | Pass; opaque panel | Unverified | Unverified | Red, 1/3 |

## Overview

All storefront captures returned HTTP 200 at the initial 1440×900 viewport.
Screenshots are fresh deployment captures, not historical run-time screenshots.

| Model | Elapsed | Results commit | Storefront | Exact page title |
| --- | ---: | --- | --- | --- |
| gpt-6-astra | 21m 04s | d67a9f00 | [Night Shift](https://benchmark-20260906-clean-sheet-high-codex-gpt-6-astra.vercel.app) | Night Shift — Shirts for people who look up |
| gpt-5.6-sol | 22m 22s | 14d4ed07 | [STATUS/WEAR](https://benchmark-20260906-clean-sheet-high-lovat.vercel.app) | STATUS/WEAR — Protocol Apparel |
| gpt-5.6-terra | 12m 30s | 41ad2a8c | [Trail Marker Supply](https://benchmark-20260906-clean-sheet-high-two.vercel.app) | Trail Marker Supply — Field Edition 01 |
| gpt-5.6-luna | 26m 02s | 90e9f6e4 | [Night Shift Club](https://benchmark-20260906-clean-sheet-high-teal.vercel.app) | Night Shift Club — Timestamp Tee |
| claude-fable-5-1 | 24m 37s | c7173019 | [Status Tees](https://benchmark-20260906-clean-sheet-high-fawn.vercel.app) | Status Tees — HTTP status code t-shirts |
| claude-opus-5 | 44m 27s | 6b779482 | [Automata Supply](https://benchmark-20260906-clean-sheet-high-rosy.vercel.app) | Automata Supply — wearable cellular automata |
| claude-sonnet-5 | 22m 36s | bffe31cf | [STATUS/CODE](https://benchmark-20260906-clean-sheet-high-coral.vercel.app) | STATUS/CODE — HTTP Status Code Tees |

Three models independently chose HTTP-code merchandise (Sol, Fable, Sonnet).
Astra chose astronomy; Terra topographic/outdoor imagery; Luna a fixed-edition
timestamp; Opus configurable cellular automata. Similar themes are not evidence
of cross-run contamination by themselves.

## Framework and major technology choices

Every model chose Next.js App Router, React 19 and hosted Stripe Checkout. The
important implementation differences are explicit below.

| Model | Web stack | Stripe | Artwork / other major choices |
| --- | --- | --- | --- |
| Astra | Next 16.3.4, React 19 | Stripe 18.5 SDK | Zod validation, Sharp, versioned static print PNGs |
| Sol | Next 16.3.4, React 19 | Stripe 22.6.1 SDK | Static generated artwork |
| Terra | Next 16.3.4, React 19 | Stripe 22.6.1 SDK | Static generated topographic artwork |
| Luna | Next 16.3.4, React 19 | Direct Stripe REST calls, no SDK | Fixed print PNG plus a client-side live clock |
| Fable | Next 16.3.4, React 19 | Stripe 22.6.1 SDK | Shared SVG renderer, resvg, bundled JetBrains Mono fonts |
| Opus | Next 15.5.25, React 19 | Stripe 18.5 SDK | Deterministic indexed-PNG rasterizer, bitmap lettering and cellular automata |
| Sonnet | Next 16.3.4, React 19 | Stripe 22.6.1 SDK | SVG-to-PNG static print/mockup generation with Sharp |

Sonnet's font rendering therefore happens during asset generation, not on each
production request.

**External reference usage.** These counts measure retained evidence of calls
to third-party reference sources while the model worked, not runtime Stripe or
Prodigi API traffic and not links merely written into a README or final answer.
A search call that covered two topics counts once in each topic column, so
topical counts need not add up to total web-tool calls. “Request” includes a
retained browser open/find interaction or a direct terminal page fetch; API
requests used to create or inspect live test objects are excluded.

| Model | Stripe references | Prodigi references | Framework references | Other / coverage limit |
| --- | --- | --- | --- | --- |
| Astra | 2 search calls + 1 direct document request | 1 search call + 3 direct documentation/product-page requests | 0 retained third-party calls | 4 web-tool calls total; all completed, plus 2 successful terminal page fetches |
| Sol | 2 search calls; no attributable document request retained | 3 search calls; no attributable document request retained | 1 Next.js search call | 5 web-tool calls total; 2 completed document interactions lost their source attribution |
| Terra | 1 search call; no attributable document request retained | 2 search calls; no attributable document request retained | 0 retained third-party calls | 6 web-tool calls total; 3 completed document interactions lost their source attribution |
| Luna | 1 search call; no attributable document request retained | 2 search calls; no attributable document request retained | 0 retained third-party calls | 3 web-tool calls total; 1 completed document interaction lost its source attribution |
| Fable | Unknown | Unknown | Unknown | Claude envelope reports 0 built-in web searches and 0 web fetches; terminal/tool history was not retained |
| Opus | Unknown | Unknown | Unknown | Claude envelope reports 0 built-in web searches and 0 web fetches; terminal/tool history was not retained |
| Sonnet | Unknown | Unknown | Unknown | Claude envelope reports 0 built-in web searches and 0 web fetches; terminal/tool history was not retained |

The Codex logs also show local reads of OpenAI's Sites execution instructions;
those are first-party harness references, not third-party Stripe, Prodigi,
Next.js or React sources, so they are excluded. Every retained Codex web item
reached a completed tool event, but this old event format did not preserve an
HTTP outcome for every opened document. Failed or incomplete source retrievals
therefore cannot be counted more precisely. The Claude zeroes cover only the
provider's built-in server web tools; they must not be interpreted as zero
overall external-source use.

## Stripe integration and payment evidence

All seven use hosted Checkout, not Elements. Stripe list responses covered all
available objects (`has_more=false`) for Sessions, PaymentIntents, Customers,
events and webhook endpoints at inspection time. No Customer objects were
present in any profile. Some unpaid probe Sessions lack application metadata.

| Model | Sessions / paid | PaymentIntents / succeeded | Payment evidence | Registered webhook |
| --- | ---: | ---: | --- | --- |
| Astra | 2 / 2 | 2 / 2 | Two $102.00 app carts; both fulfilled | `/api/webhooks/stripe`, completed + async succeeded |
| Sol | 3 / 0 | 0 / 0 | $32.00 app Sessions, no payment | `/api/webhooks/stripe`, completed |
| Terra | 2 / 0 | 0 / 0 | $38.00 app Sessions, no payment | `/api/stripe-webhook`, completed |
| Luna | 3 / 0 | 0 / 0 | $34.00 and $68.00 app Sessions, no payment | `/api/stripe-webhook`, completed |
| Fable | 9 / 1 | 1 / 1 | $34.99 navy/XL 418 response tee fulfilled | `/api/stripe/webhook`, completed + async succeeded |
| Opus | 10 / 2 | 2 / 2 | $131.95 multi-item cart and $43.95 custom Rule 184 fulfilled | `/api/webhooks/stripe`, completed + async succeeded |
| Sonnet | 4 / 1 | 1 / 1 | $30.00 paid metadata-free test; app Sessions remain unpaid | `/api/webhooks/stripe`, completed |

“Completed” in the webhook column means `checkout.session.completed`; “async
succeeded” means `checkout.session.async_payment_succeeded`. All endpoints are
enabled, target their own run's deployment, and have no explicit endpoint API
version pin (`api_version=null`).

### Astra: original app checkout, not a replacement fixture

The committed `scripts/complete-test-checkout.mjs` confirms the app-created
Session from `verification.json` through Stripe's payment-page endpoint,
providing shipping at confirmation. It does not clone a Session or remove the
hosted shipping requirement. Both actual paid Sessions contain collected
shipping, the app's cart metadata and Prodigi receipts. Orders `ord_1170684`
and `ord_1170685` each contain orbit/M×1 and phase/S×2. The latter freezes
artwork revision v2. Completion events have zero pending webhooks. This is
API-driven completion of the app checkout, not an independently replayed browser
card-entry test.

### Fable and Opus: payment and fulfillment confirmed, browser gestures not replayed

Fable's paid Session links to `ord_1170711` through its PaymentIntent receipt;
Prodigi has the same Session reference and the selected navy/XL variant. The
receipt records `AlreadyExists`, consistent with reuse of the existing order.
The completion event has zero pending webhooks.

Opus's latest paid Session links to `ord_1170722`, black/XL Rule 184, which is
Complete. An earlier paid multi-item Session created both `ord_1170716` and
`ord_1170717`, approximately seven seconds apart. Those are duplicate orders
for one payment, not two separate customer purchases. The latest completion
event still reports one pending webhook; receipt presence alone cannot establish
whether the webhook or success-page fallback performed fulfillment. Do not
claim independently confirmed final webhook delivery.

### Sonnet: a paid test is not a paid customer-order test

The sole paid Session has no slug/size metadata and no collected shipping.
Its $30.00 succeeded PaymentIntent is genuine, but the committed webhook exits
without fulfillment when product metadata is absent. The real 404/M ($29.00)
and 418/L ($32.00) application Sessions remain unpaid. Order `ord_1170723`
instead has reference `e2e-test-1788717757` and a 500 design, unrelated to either
app Session. It is direct API smoke evidence, not payment-to-order proof. The
agent's own final report acknowledges that it did not complete browser checkout.

## Application flow and failure recovery

No Scalable Press call was found in the committed runtime sources.

| Model | Call order and stored design context | Failure/recovery behavior |
| --- | --- | --- |
| Astra | Validate cart → Prodigi `POST /v4.0/quotes` → Stripe Session → signed paid webhook → `POST /v4.0/orders` → Session receipt; status reads `GET /v4.0/orders/{id}` | Server price/quantity checks, paid/test guards, current shipping field, JSON-body idempotency key, versioned artwork. Webhook errors return 500. No durable queue/admin recovery. |
| Sol | Server catalog price → Session metadata (product, color, size, asset base) → paid webhook or success-page fulfillment → sandbox `POST /v4.0/orders` | Current shipping extraction and JSON-body idempotency key. No persisted receipt; success-page GET can perform fulfillment. No paid execution observed. |
| Terra | Server price → Session product/size/color → signed paid webhook → `POST /v4.0/Orders` | Current shipping extraction, JSON-body idempotency key; HTTP errors return 502. Does not persist an order ID or inspect semantic order issues; Prodigi callback is a no-op. Asset origin may use deployment-specific `VERCEL_URL`. |
| Luna | Session metadata stores first cart item/variant/quantity → signed webhook → `POST /v4.0/Orders` with static PNG | Reads legacy `shipping_details`; no paid-state guard; no receipt storage/fallback. A synthetic legacy-shaped event worked, not a current paid event. Success page claims payment/queue success without checking the Session. |
| Fable | Server price/oversize/shipping → Session design metadata → retrieve paid Session/PI → sandbox `POST /v4.0/Orders` → PI receipt → order status GET | Current shipping, JSON-body idempotency, completed/async handlers, success/status fallback. No durable queue. Asset rendering and color depend on the frozen metadata. |
| Opus | Encode cart rules/seeds/ink/cells/variants into Session metadata → paid webhook or success fallback → receipt check → order prelookup → `POST /v4.0/Orders` → PI receipt | Current shipping, delayed fallback, but non-atomic duplicate protection and wrong idempotency placement. Some HTTP failures are classified non-retryable. |
| Sonnet | Server catalog price → Session slug/size → signed completed event → static design URL → `POST /v4.0/orders` | Current shipping with billing-address fallback, no paid guard or idempotency key. Missing data returns 200 without an order. Success checks payment but claims production without checking fulfillment. |

### Opus: duplicate protection remains a launch blocker

The final code sends `Idempotency-Key` as an HTTP header, not the JSON body's
`idempotencyKey` field. The four header-only probe orders (`ord_1170718`–
`ord_1170721`) do not demonstrate that Prodigi lacks idempotency support.
Prodigi documents the body field and explicitly distinguishes it from a
merchant reference. [Prodigi idempotency reference](https://www.prodigi.com/print-api/docs/reference/#idempotency-key).

The added receipt check and merchant-reference prelookup reduce repeat work,
but simultaneous handlers can both find no order and submit. No new duplicate
was observed for the latest single-item Session; the prior duplication is
observed evidence, while the remaining race is a source-code finding. This is
why Opus is yellow despite a completed paid order and good artwork.

## Design correctness and print proof

The viewer preserves original bytes, full canvas, alpha and positioning. No
customer design was cropped, flattened, recolored, or replaced with an inferred
mockup. All seven originals were viewed against a dark background. Actual
Prodigi thumbnails were fetched for Astra, Fable, Opus, and Sonnet's separate
500 smoke design. Luna's order had no thumbnail URL; Sol/Terra have no matched
orders. White artwork can disappear on Prodigi's white thumbnail background;
the independently viewed transparent original is necessary evidence.

| Model | Viewer source | Canvas | Nontransparent pixels | Bounds, exclusive right/bottom | Transparency |
| --- | --- | --- | ---: | --- | --- |
| Astra | Paid orbit asset, `ord_1170685` | 4677×5881 | 956,727 | (906,407)–(3771,5129) | RGBA, clear background |
| Sol | Actual unpaid 418/orange/XL Session selection | 6000×7200 | 2,151,132 | (493,2340)–(5504,4321) | RGBA, clear background; dark lettering for orange garment |
| Terra | Actual unpaid charcoal/M selection | 2490×3510 | 8,739,900 | Full canvas | Fully opaque dark topographic panel |
| Luna | Actual unpaid black/M selection | 2172×724 | 165,665 | (33,104)–(2011,463) | RGBA, mostly antialiased white lettering and cyan cursor |
| Fable | Paid 418 response asset, `ord_1170711` | 4665×5844 | 499,502 | (320,1029)–(4334,2966) | RGBA, clear background |
| Opus | Paid custom Rule 184 asset, `ord_1170722` | 3000×3758 | 2,720,444 | (169,225)–(2831,3103) | Indexed PNG with transparency |
| Sonnet | Actual unpaid 418/L Session selection | 4665×5844 | 27,262,260 | Full canvas | Colored panel; no fully transparent pixels |

Astra/Fable/Opus viewer originals match Prodigi's recorded MD5 hashes. Astra's
second paid phase-v2 asset was also fetched and hash-matched. Luna's static
customer-path PNG matches synthetic order `ord_1170700`, but that does not turn
the unpaid Session into a paid order. Sonnet's separate 500 smoke source was
fetched, hash-matched, and archived as `submitted.png`; it is not the viewer's
418 design. Its opaque panel is intentional in the SVG and is disclosed here,
not silently removed.

Luna's printed edition is `2026-09-06 23:41`, not the live clock or purchase
time. Clean-sheet did not require purchase-time capture, so the fixed edition
does not itself fail the theme criterion. The unusually wide, short canvas and
lower raster resolution require physical-size validation; the print is not
equivalent to a full high-resolution garment template. No physical print
placement is independently proven for any model.

### Garment and print-area mapping

| Model | Customer garment mapping | Print area / sizing | Evidence limit |
| --- | --- | --- | --- |
| Astra | `GLOBAL-TEE-GIL-64000`, black; paid M and S, quantities 1 and 2 | front / fitPrintArea | Both paid item mappings confirmed |
| Sol | `GLOBAL-TEE-GIL-5000`; selected orange/XL | front / fitPrintArea | Committed route + unpaid Session, no delivered app order |
| Terra | `TEE-AA-1301`; charcoal/forest/cream; selected charcoal/M | front / fitPrintArea | Catalog confirms these colors; no paid delivery |
| Luna | `TEE-GIL-64000`; selected black/M; also offers asphalt/navy blue/white | front / fitPrintArea | Fresh catalog includes asphalt but not navy blue for this exact SKU; synthetic black/M only |
| Fable | `GLOBAL-TEE-GIL-64000`; paid navy blue/XL | front / fillPrintArea | Paid source and order match; all large-size/color combinations not exhaustively tested |
| Opus | `GLOBAL-TEE-GIL-64000`; paid black/XL, earlier black/L and navy blue/M | front / fillPrintArea | Paid mappings confirmed; duplicate prevention fails separately |
| Sonnet | `GLOBAL-TEE-GIL-64000`, black, S–2XL; selected L | front / fillPrintArea | Unpaid 418/L; direct smoke tested 500/M |

Catalog dimensions and individual print-area variant sizes are not interchangeable
with a photographed shirt frame. The viewer shows each submitted canvas at its
own aspect ratio. `fitPrintArea` preserves aspect ratio inside the area;
`fillPrintArea` may crop to fill it. Accurate physical placement still requires
the exact variant template and a sample. [Prodigi sizing reference](https://www.prodigi.com/print-api/docs/reference/).

## Testing and observed storefront issues

Astra has seven explicit automated tests covering cart validation, prices,
variant mapping, test-mode guards, paid-order validation, stable idempotency,
and immutable artwork revisions. Its transcript and verification scripts also
record real API-driven app checkout and fulfillment. The other six have no
dedicated automated application test suite in the archived source; builds and
API probes are not equivalent to regression tests. This audit inspected those
artifacts and external evidence; it did not rerun arbitrary archived scripts.

All seven viewport screenshots and available favicons were captured. Astra,
Luna and Opus publish no captured favicon. Only Fable publishes a captured
social preview. Missing previews are labeled missing, never reconstructed.
Six storefronts had no captured page errors; Luna emitted React error 418
during capture (a hydration-related warning/error requiring investigation).
The captures occurred at 17:49–17:50 UTC for the first six and 18:31 UTC for
Sonnet, after their respective runs finished.

Claude runs in this suite used the old result-only adapter. Their complete
tool conversations are unavailable, so documentation-use comparisons and exact
browser gestures cannot be reconstructed from final claims. Later adapter
changes do not retroactively improve these artifacts.

## Isolation and reproducibility

All seven have distinct run IDs, Vercel project names, deployment origins and
saved Stripe profile paths. Every immutable artifact has the same prompt hash,
base commit and high reasoning setting. Each profile reports a distinct sandbox
account; all seven registered webhook origins point to the matching deployment.
The enumerated Session, PaymentIntent and event records do not predate their
run starts. No cross-run Stripe object reuse was found in these snapshots.

| Model | Saved-profile account identity | Profile / claim state |
| --- | --- | --- |
| Astra | acct_1UCgc76og33WInBg | Saved; claim link available; expires September 13 |
| Sol | acct_1UCcrsIzjxVr4GGi | Saved; claim link available; expires September 13 |
| Terra | acct_1UChrUDnNQ3buYlz | Saved; claim link available; expires September 13 |
| Luna | acct_1UCiEmLhZd297txp | Saved; claim link available; expires September 13 |
| Fable | acct_1UCh72IssjYdqo8U | Saved; claim link available; expires September 13 |
| Opus | acct_1UCcIyLs2gmSYFE4 | Saved; claim link available; expires September 13 |
| Sonnet | acct_1UCgYC87w6ZGvmDh | Saved; claim link available; expires September 13 |

Profiles were copied to ignored `.benchmark-secrets/stripe/<run-id>.toml` with
restricted permissions. Claim URLs and credentials are intentionally omitted.
An independent `GET /v1/account` returned 403 for all seven restricted test
keys, so account identities above are profile-reported, not verified by that
endpoint. Object-level evidence is available, but this is not proof against
all possible ambient-machine contamination.

Prodigi credentials/account state were intentionally shared. The latest 100
orders cover this suite's entire execution window; older orders remain beyond
that page. Paid-order attribution uses matching Stripe receipts and order
references, not merely overlapping timestamps. Direct and synthetic orders are
separate evidence. No conflicting cross-run attribution was found among the
identified suite orders. The runs shared host tooling and service logins, so
this was workspace/profile isolation, not seven isolated machines.

## Token usage

Fresh input includes Claude cache creation, but excludes cache reads. Codex
input totals already include cached input, so fresh input subtracts that subset.
These figures measure provider-reported usage, not documentation-reading volume.

| Model | Fresh input | Cache reads | Cache creation (included in fresh) | Output |
| --- | ---: | ---: | ---: | ---: |
| Astra | 107,736 | 3,339,008 | Not separately reported | 32,472 |
| Sol | 128,848 | 7,785,472 | Not separately reported | 33,670 |
| Terra | 129,876 | 3,368,704 | Not separately reported | 25,243 |
| Luna | 313,108 | 22,183,552 | Not separately reported | 51,018 |
| Fable | 124,305 | 3,269,626 | 122,795 | 70,609 |
| Opus | 165,603 | 10,133,762 | 165,403 | 113,954 |
| Sonnet | 142,140 | 9,921,006 | 141,906 | 76,189 |

## Complexity

Counts include nonblank and blank lines in JS/TS/JSX/TSX/CSS under runtime
app/lib/components/src/api directories; declarations and generated/dependency
trees are excluded. Verification counts cover scripts/tests JS/TS/MJS. Compressed
source can have fewer lines without being easier to maintain.

| Model | Runtime files / lines | Verification files / lines | Maintenance observations |
| --- | ---: | ---: | --- |
| Astra | 11 / 141 | 7 / 112 | Very compressed source; tests and versioned artwork reduce some risks |
| Sol | 10 / 382 | 0 / 0 | Small static catalog, no durable order receipt |
| Terra | 7 / 116 | 0 / 0 | Compact but little observability/recovery |
| Luna | 68 / 7,852 | 0 / 0 | Large mostly unused UI scaffold around a small store; manual Stripe signature code |
| Fable | 22 / 1,280 | 0 / 0 | Broad combinatorial catalog, shared renderer, fallback fulfillment |
| Opus | 29 / 3,197 | 0 / 0 | Custom raster engine and encoded cart; payment/fulfillment concurrency complexity |
| Sonnet | 16 / 914 | 1 / 64 | Static generation script, straightforward catalog, weak fulfillment state |

## Production-quality pieces and launch blockers

| Model | Good foundation | Blockers before launch |
| --- | --- | --- |
| Astra | Coherent theme; exact paid assets; server validation; tests; immutable revisions | Explicit test-only guards require a deliberate live-mode implementation, not just new keys; durable fulfillment monitoring/recovery, policies, tax/shipping economics and physical samples |
| Sol | Large transparent customer artwork; explicit catalog/variant metadata; current shipping extraction | Complete a real customer flow; prove Prodigi delivery; persist receipts and failed-order recovery; review live shipping/margins and font/mockup consistency |
| Terra | Coherent outdoor panel; server-controlled price; valid catalog colors | Prove paid delivery and public asset access; inspect order outcomes, store receipts, implement useful callbacks/recovery; sample opaque panel across garment colors |
| Luna | Readable fixed-edition artwork; live storefront and hosted Session creation | Fix current shipping field and navy-blue SKU mapping; add paid guard and truthful success state; resolve hydration error; complete paid integration test and physical-scale check |
| Fable | Paid variant fulfilled; bundled-font rendering; body idempotency and receipt reuse | Automated regression tests, durable retry/alerting, full color/size/country validation, samples and commercial configuration |
| Opus | Distinctive deterministic artwork; paid multi-item/custom carts; actual variant mapping | Use documented body idempotency plus robust concurrency control; fix retry classification and verify webhook delivery; add regression tests for duplicate/failure cases |
| Sonnet | Legible generated catalog, consistent static artwork, working Session creation | Complete actual app checkout; add paid guard and idempotency; do not acknowledge missing fulfillment data as success; stop equating paid with production; persist order status and add tests |

## Human handoff

Claim or replace each temporary Stripe sandbox before September 13, 2026; use
its saved profile rather than switching a global account. Do not publish claim
links. Before live sales, configure owned Stripe/Prodigi live accounts, deliberate
environment switching, production webhook secrets, tax/shipping/pricing,
receipts/support/returns, and monitoring for paid-but-unfulfilled orders.
Fix the model-specific blockers above first. Order physical samples for the
actual garment, print area, color and design variants. Green means this
benchmark's three checks have evidence, not that those business and operational
requirements are complete.

The viewer contains each original final response, exact primary customer-path
artwork, screenshots, captured favicons and Fable's published social preview.
Final-response claims are preserved as agent claims; this audit is the separate
source of independent conclusions.
