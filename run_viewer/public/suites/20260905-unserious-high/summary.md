# Seven-model unserious-prompt benchmark

Suite `20260905-unserious-high` ran all seven models sequentially at **high** reasoning against `prompt-unserious.md`: the minimal prompt plus “The website should be unserious.” This did not relax the timestamp-only shirt requirement. Base commit: `47f0fee2d4632ed732b3df43ce90e4763fe117a6`; prompt SHA-256: `5ea01768db6286008e7b9ae6298f5396bfb729894c714e240b90676a14a331eb`.

All seven agent processes exited successfully. The last publication finished September 6, 2026 at 06:18:32 UTC (September 5, 11:18:32 PM Pacific). Astra's artifact publication required a manual recovery for whitespace in a vendored font license; its original code and license were preserved. The audit and viewer import happened September 6, after the runs finished.

These are directional case studies, not a controlled model ranking or launch certification. An agent finishing, a successful build, and a working business are different outcomes.

## Audit outcome

Green requires three independently supported checks: printable timestamp-only artwork, a genuine payment through the app's fulfillment path, and correct Prodigi artwork/garment delivery. Yellow means two pass; red means zero or one pass. **Unverified does not count as a pass or establish a proven code failure.**

| Run | Timestamp print | Checkout | Prodigi | Overall |
| --- | --- | --- | --- | --- |
| Astra | Pass | Unverified original checkout; paid fixture only | Pass for fixture's backend path | Yellow · 2/3 |
| Sol | Fail: nearly invisible glyphs and extra slogan | Unverified: no payment | Unverified: standalone order only | Red · 0/3 |
| Terra | Fail: extra slogans | Unverified: no payment | Fail: fit selection does not change garment | Red · 0/3 |
| Luna | Fail: opaque canvas and tiny marks | Unverified: no payment | Fail: both fits use one unisex garment | Red · 0/3 |
| Fable | Pass | Pass | Pass | Green · 3/3 |
| Opus | Pass | Pass | Fail: paid fitted selection becomes unisex SKU | Yellow · 2/3 |
| Sonnet | Fail: opaque background and subtitle | Pass | Pass | Yellow · 2/3 |

Fable is the only three-check pass. That does not certify its outage handling, physical print placement, policies, tax setup, or production readiness. Opus and Sonnet prove that collecting payment and delivering an asset are insufficient to pass the whole benchmark. Sol, Terra, and Luna's direct Prodigi smoke orders must not be presented as customer checkout success.

### Evidence and limitations

The audit inspected committed runtime code and available transcripts, saved isolated Stripe profiles, all current objects returned by the relevant Stripe list endpoints, the newest 100 shared Prodigi orders, original deployed artwork, Prodigi thumbnails, and all seven live homepages. Stripe lists had no additional pages; Prodigi has older pages, but the fetched page covers every suite-associated order identified here. Checks did not create new payments or orders.

Codex transcripts include command execution evidence. Claude archives contain result/usage envelopes and final reports, not step-by-step browser transcripts; exact browser-payment gestures claimed by those agents cannot be independently reconstructed from that archive. Their succeeded Stripe objects, delivered payment events, matching application metadata/code, and corresponding Prodigi orders independently establish the paid integration outcomes recorded here. No browser payment was replayed during this audit.

Prodigi sandbox completion does not mean a physical garment was manufactured or inspected. See the [Prodigi Print API reference](https://www.prodigi.com/print-api/docs/reference/). Source image quality was evaluated separately from API acceptance.

## Overview

All durations below are agent execution time, excluding later audit and publication recovery. Page titles are exact values from fresh 1440×900 browser captures on September 6 around 15:10 UTC, not historical titles at run completion. Fable changes its title with the timestamp.

| Model | Reasoning | Agent result | Duration | Deployment | HTTP | Captured title |
| --- | --- | --- | --- | --- | --- | --- |
| `gpt-6-astra` | High | Exit 0; publication recovered | 29m 09s | [Astra storefront](https://benchmark-20260905-unserious-high-codex-gpt-6-astra.vercel.app) | 200 | `datetime.store — Wear right now. Forever.` |
| `gpt-5.6-sol` | High | Exit 0 | 23m 50s | [Sol storefront](https://benchmark-20260905-unserious-high-c-tau.vercel.app) | 200 | `datetime.store — own a millisecond` |
| `gpt-5.6-terra` | High | Exit 0 | 11m 51s | [Terra storefront](https://benchmark-20260905-unserious-high-c-three.vercel.app) | 200 | `datetime.store — a shirt from right now` |
| `gpt-5.6-luna` | High | Exit 0 | 15m 48s | [Luna storefront](https://benchmark-20260905-unserious-high-c-nu.vercel.app) | 200 | `datetime.store — the shirt that knows what time it is` |
| `claude-fable-5-1` | High | Exit 0 | 20m 22s | [Fable storefront](https://benchmark-20260905-unserious-high-c-gamma.vercel.app) | 200 | `1788707421667 · datetime.store` |
| `claude-opus-5` | High | Exit 0 | 37m 31s | [Opus storefront](https://benchmark-20260905-unserious-high-c-tan.vercel.app) | 200 | `datetime.store — we sell a t-shirt with the current datetime` |
| `claude-sonnet-5` | High | Exit 0 | 25m 33s | [Sonnet storefront](https://benchmark-20260905-unserious-high-c-silk.vercel.app) | 200 | `datetime.store — a t-shirt with the current datetime on it` |

Several runner URL fields included adjacent Markdown; the viewer uses the normalized public Vercel hostname. Original metadata and final outputs remain unchanged. Terra and Luna emitted React hydration error #418 during capture; both still rendered a screenshot. Other captured pages emitted no page errors. Reachability is not checkout verification.

## Framework and major choices

Versions below are from committed lockfiles.

| Run | Runtime | Payments | Artwork |
| --- | --- | --- | --- |
| Astra | Next 16.3.4, React 19.2.8, TypeScript; Stripe 18.5.0 | Hosted Checkout | Bundled IBM Plex Mono converted to outlines, Sharp PNG; signed design token |
| Sol | Next 16.3.4, React 19.2.6, TypeScript; Stripe 22.6.1 | Hosted Checkout | Sharp SVG rasterization using server Arial fallback; extra slogan |
| Terra | Next 16.3.4, React 19.2.8, TypeScript; Stripe 22.6.1 | Hosted Checkout | `next/og` image route with timestamp and slogans |
| Luna | Next 16.3.4, React 19.1.0, JavaScript; Stripe 17.7.0 | Hosted Checkout | Sharp SVG with system-font dependency and opaque white background |
| Fable | Next 16.3.4, React 19.2.8, TypeScript; Stripe 22.6.1 | Elements/PaymentIntents, PaymentElement and Express Checkout | `next/og` with bundled Chivo; full-resolution and preview widths |
| Opus | Next 15.5.25, React 19.1.1, TypeScript; Stripe 18.5.0 | Hosted Checkout | Custom polygon glyph rasterizer and PNG encoder; grayscale plus alpha |
| Sonnet | Next 15.5.25, React 18.3.1, TypeScript; Stripe 16.12.0 | Hosted Checkout | `next/og`, 1200×1500 opaque artwork, also used by social preview |

## Stripe objects and isolation

All paid objects here are sandbox payments of $22.50 USD each. No Customer objects were returned in any of the seven accounts at audit time. Sol, Terra, and Luna request `customer_creation=always`, but their Sessions remained unpaid. Receipt email or Checkout customer details are not themselves a persistent Customer object.

| Run | Isolated account | Checkout Sessions | PaymentIntents | Main metadata |
| --- | --- | --- | --- | --- |
| Astra | `acct_1UCQLhAtDBfbAf5n` | 7: 2 paid, 5 expired/unpaid | 2 succeeded | Signed artwork token, timestamp, style, size, store ID; fulfillment state and order ID |
| Sol | `acct_1UCR2GGp1vu2kDm2` | 3 open/unpaid | 0 | Timestamp, fit, size; intended order ID after fulfillment |
| Terra | `acct_1UCW9rDpLS8w3ED0` | 1 open/unpaid | 0 | ISO designTime, fit, size, product SKU |
| Luna | `acct_1UCJO78a6SQqNNeu` | 9 open/unpaid, including one small probe | 0 | Timestamp, style, size on app Sessions |
| Fable | `acct_1UCIAgGlW0PtPug4` | 0 | 3: 2 succeeded, 1 requires payment method | Timestamp, garment/style/size, artwork URL, fulfillment receipt/error |
| Opus | `acct_1UCXDYImkHwP8F4L` | 9: 1 paid, 8 open | 1 succeeded | Timestamp, fit, color, size; PI order ID |
| Sonnet | `acct_1UCXuAE3z62Ne6Dv` | 3: 2 paid, 1 open probe | 2 succeeded | Session stampMs/color/size; PI Prodigi ID after submission |

Each run's restricted test-key profile is saved privately under `.benchmark-secrets/stripe/`, including durable copies recovered from the suite worktree. All seven profiles include a sandbox claim URL and report September 13 expiration. Claim usability was not exercised; do not publish these bearer links. These are distinct Stripe accounts, but **the Prodigi sandbox credential and its order history were shared**, including earlier suites and subsequent user tests. Attribution therefore uses payment references, metadata, timestamps, deployed URLs and artwork hashes, not proximity in the order list alone.

### Registered webhooks

All seven accounts have an enabled endpoint. Every endpoint returns `api_version: null`, meaning no endpoint-specific version was pinned. Registration alone does not prove delivery or a working handler.

| Run | Endpoint path | Events |
| --- | --- | --- |
| Astra | `/api/webhooks/stripe` | `checkout.session.completed`, `checkout.session.async_payment_succeeded` |
| Sol | `/api/stripe/webhook` | `checkout.session.completed` |
| Terra | `/api/webhooks/stripe` | `checkout.session.completed` |
| Luna | `/api/webhooks/stripe` | `checkout.session.completed` |
| Fable | `/api/stripe/webhook` | `payment_intent.succeeded` |
| Opus | `/api/stripe/webhook` | `checkout.session.completed`, `checkout.session.async_payment_succeeded` |
| Sonnet | `/api/webhook` | `checkout.session.completed` |

Relevant successful payment events for Astra's fulfilled fixture, Fable's deployed payment, Opus and Sonnet had zero pending webhooks. Astra also has an earlier paid fixture with absent shipping, a pending delivery and `retrying` fulfillment state. Sol, Terra and Luna had no payment events.

**Astra's qualification matters:** `scripts/integration-test.mjs` first calls the app, then clones its Checkout Session with hosted shipping collection removed, seeds shipping on the PaymentIntent, expires the original Session and pays through Stripe's payment-page fixture API. Order `ord_1170586` is real paid backend evidence, not proof that the unmodified hosted checkout works. Its original checkout remains unverified, not proven broken.

## Application flow and recovery

Runtime inspection found no remaining Scalable Press API calls. Prodigi paths below are relative to the sandbox `/v4.0` base; case is preserved where useful. Only Astra performs product preflight in the ordinary pre-payment path. No inspected ordinary checkout creates a Prodigi order before its intended payment step, but Luna and Sonnet's webhook guards are insufficient for delayed-payment methods.

| Run | Ordering sequence | Failure and recovery behavior |
| --- | --- | --- |
| Astra | Server-signed moment → `GET /products/{sku}` → hosted Session → paid/complete/amount/currency/store/environment checks → `POST /orders` → Session receipt; `GET /orders/{id}` for status | Checkout rejects invalid tokens/origins and unsupported variants; live mode is explicitly disabled. Webhook failures record retrying state and return 500. Buyer status route can retry fulfillment. Session-based idempotency; existing order is reused. A quote helper exists but is not in normal checkout. |
| Sol | Client timestamp → hosted Session → retrieve paid Session → `POST /Orders` → Session order ID | Checks current and legacy shipping locations, paid state and inputs. Webhook errors return non-2xx; buyer `/api/order` can retry. Session-based idempotency. No paid execution was observed, and there is no durable shipment tracking workflow. |
| Terra | Client ISO timestamp → hosted Session → paid completion webhook → `POST /orders` | Current collected-information shipping field is used in final code. Both fit labels map to one garment. HTTP failures retry through non-2xx; no persisted order ID/status or buyer repair route. An HTTP-success response alone is not checked for asset/order issues. |
| Luna | Client timestamp/style → hosted Session → completion webhook or paid `/api/complete` fallback → `POST /orders` | Fulfillment reads only legacy `session.shipping_details`; webhook calls it without its own paid guard. SDK retrieval pins `2024-12-18.acacia`, so callback retrieval can differ from an unpinned event. This is a compatibility risk, not proof that the fallback failed: there was no paid test here. Session idempotency exists; no durable order receipt. Invalid variant inputs silently default. |
| Fable | Browser freezes timestamp → validated server PaymentIntent → Elements confirmation → retrieve succeeded PI → `POST /Orders` → PI receipt → `GET /Orders/{id}` | Server owns price, validates address and corrects excessive clock drift. Webhook returns 500 on fulfillment failure; authenticated status route can retry. PI-based order idempotency; no PI-creation idempotency. Callback triggers an authoritative order fetch rather than trusting posted status, but callback authentication still needs review. |
| Opus | Server timestamp → hosted Session → retrieve paid Session → `POST /Orders` → PI receipt | Current shipping extraction, Session idempotency, webhook retry and success-page fulfillment fallback are present. **Fit is ignored** by order construction. Recording the receipt is best-effort, so outage/duplicate tests remain necessary. Customer page is not a full shipment-status system. |
| Sonnet | Client timestamp, server freshness check → hosted Session → completion webhook → `POST /Orders` → best-effort PI order ID | No explicit paid-state guard and no async-success handler. Missing metadata can be acknowledged without fulfillment. HTTP exceptions retry; `CreatedWithIssues` is only warned about. Success page checks payment, not verified fulfillment; there is no buyer recovery path. |

## Design correctness and print proof

`design.png` is the unchanged complete source canvas, not a crop, shirt mockup, thumbnail, or local improvement. Bounds below use pixel coordinates with exclusive right/bottom edges. The viewer changes the background behind those original pixels; it does not flatten or recolor them. PNG alpha-channel presence alone does not mean pixels are transparent.

| Run | Customer-path example and recovery | Dimensions / alpha | Nontransparent pixels and bounds | Print verdict |
| --- | --- | --- | --- | --- |
| Astra | Fixture paid order `ord_1170586`, epoch `1788666438003` | 4677×5881 RGBA | 130,769; `(1299,788)–(3370,984)` | Legible raw epoch, upper-canvas placement, genuinely transparent |
| Sol | Hosted route using unpaid Session epoch `1788624000000` | 4665×5844 indexed PNG with transparency | 2,728; `(2034,1827)–(2640,2079)` | Tiny broken-looking glyphs; code additionally prints “EXACTLY ONE (1) MOMENT” |
| Terra | Hosted route using unpaid Session `2026-09-06T04:00:00.000Z` | 4688×5881 RGBA | 126,111; `(1226,2660)–(3471,3221)` | Timestamp plus “THE INSTANT WAS” and “AND THEN IT WASN'T”; not timestamp-only |
| Luna | Hosted route using unpaid fitted/M Session epoch `1788650000123` | 4200×5370 RGBA, fully opaque | 22,554,000; full canvas | White rectangle with tiny deployed marks; source adds branding and fit/slogan text |
| Fable | Paid deployed fitted/M order `ord_1170596`, epoch `1788671655583` | 4677×5881 RGBA | 197,939; `(1105,945)–(3571,1157)` | Legible raw epoch, upper-canvas placement, transparent |
| Opus | Paid fitted/navy/L order `ord_1170598`, epoch `1788673722760` | 3300×4228 grayscale plus alpha | 127,358; `(800,698)–(2595,909)` | Legible raw epoch on transparency; garment selection is a separate failure |
| Sonnet | Paid white/L order `ord_1170600`, epoch `1788675352704` | 1200×1500 RGBA, fully opaque | 1,800,000; full canvas | Opaque off-white rectangle and “ms since epoch” subtitle |

For Astra, Fable, Opus and Sonnet, the recovered primary source's MD5 equals Prodigi's recorded source hash. Their thumbnails were fetched successfully. White-on-transparent originals were visually inspected on a dark browser proof; Prodigi's white-backed thumbnail alone obscures white ink and is not print-quality proof.

Sol's direct smoke `ord_1170588` and Terra's `ord_1170592` fetched bytes identical to their unpaid customer-route examples; hashes match. These smoke requests bypassed payment and app fulfillment. Luna's smoke `ord_1170594` used **unisex/L**, while the primary viewer image uses the actual unpaid **fitted/M** Session inputs. Its smoke source hash matches, but its bytes differ from that customer variant. All three smoke originals are separately archived as `submitted.png`; none replaces the customer-path image. Their thumbnails were inspected too.

Fable's earlier paid local test `ord_1170595` failed asset download because the URL pointed to `localhost:3000`. Its later deployed order completed. Sonnet also completed paid black/M order `ord_1170599`. These were not silently substituted or conflated.

### Garment and print-area mapping

All selected designs target `front`. The mapping below is what code/order evidence says, not an invented common shirt frame.

| Run | Garment selection | Sizing mode | Mapping caveat |
| --- | --- | --- | --- |
| Astra | Gildan 5000 unisex; Bella + Canvas 3001 for its fitted label; black | `fillPrintArea` | Distinct blanks, but BC-3001 is catalogued as unisex: describe the actual cut accurately rather than implying a women's fitted garment. Verified fixture was Gildan/M. |
| Sol | Gildan 64000 / women's 64000L; black | `fitPrintArea` | Distinct intended SKUs; only standalone Gildan/M smoke was submitted. |
| Terra | AS Colour `TEE-AS-5001`; black, regardless of classic/roomy | `fitPrintArea` | UI fit choice has no effect on garment. |
| Luna | `TEE-AS-5001`; white, regardless of fitted/unisex | `fillPrintArea` | Both fits become the same men's/unisex blank. |
| Fable | Gildan 64000 unisex / Bella + Canvas 6004 fitted; black | `fitPrintArea` | Paid fitted/M matches the women's 6004 SKU. |
| Opus | Gildan 64000 in selected color/size, regardless of fit | `fillPrintArea` | Actual paid fitted/L order is the unisex SKU. |
| Sonnet | Gildan 64000, selected black/white/navy and size | `fillPrintArea` | Paid black/M and white/L match; no fitted option implemented. |

Fresh product queries show multiple US-compatible print-area variants for Gildan/Bella blanks: commonly 4677×5881 (BC-6004: 4665×5844) or 2490×3510, while AS-5001 reports 4200×5370. The order response does not identify a single physical facility/template choice sufficient to certify inch-perfect garment positioning. Some source canvases differ in aspect ratio from available templates; `fitPrintArea` can letterbox and `fillPrintArea` can crop. Opus's 13.98×17.91-inch assumptions are code assumptions, not independent measurements. **The viewer preserves exact position within the submitted canvas; final position on a manufactured shirt remains unverified.** A physical sample and chosen supplier template are launch requirements.

### Timestamp freezing and persistence

- Astra freezes server time in a signed moment token before Checkout; verifies the token and metadata again at fulfillment. It imposes a checkout-age limit.
- Sol stores the client epoch with fit/size on the Session. Range validation does not enforce “right now”; recorded test inputs are intentionally historical.
- Terra persists the client's ISO string, fit and size on the Session. Its formatted print is not the requested raw epoch.
- Luna passes a client epoch and style into Session metadata and the artwork route; silent defaults and weak freshness validation need hardening.
- Fable freezes when the buyer submits payment, including Express Checkout; the server corrects more than five minutes of drift and persists the actual timestamp/artwork URL on the PI.
- Opus generates the timestamp server-side during Session creation and persists timestamp, fit, color and size; the print uses timestamp/color, but fulfillment ignores fit.
- Sonnet persists the client millisecond epoch after a two-minute server freshness check. Both printed variants derive from their paid Session metadata.

## Testing and independent confirmation

| Run | Agent evidence available | Independently confirmed / remaining gap |
| --- | --- | --- |
| Astra | Build/typecheck execution; four committed commerce tests plus sandbox integration script | Signed-token, amount/environment and alpha tests inspected; live asset and paid fixture verified. Original shipping UI and physical print not tested. |
| Sol | Build and TypeScript checks eventually passed after scaffold/build fixes; smoke API checks | Hosted Session and exact deployed/smoke image confirmed. No paid test or automated regression suite; rendering defect survives build success. |
| Terra | Initial legacy-field type error was fixed; later build succeeded; smoke test | Live homepage, unpaid Session, final current-field code and smoke image confirmed. No paid flow or committed automated tests. |
| Luna | Build execution and direct sandbox smoke test | Live Session/image and smoke order confirmed. No payment; legacy webhook compatibility and fallback still untested. |
| Fable | Final report claims build and paid checkout verification; committed 40-line artwork measurement script | Paid PI, successful deployed order and correct source hash independently confirmed. Full tool/browser transcript unavailable; failure/concurrency tests unverified. |
| Opus | Final report claims build/typecheck and paid hosted test; no committed tests | Paid Session, order, source hash and wrong-fit code independently confirmed. Browser gestures not replayed; duplicates/outages/physical placement untested. |
| Sonnet | Final report claims build and paid variants; no committed tests | Both paid orders and intended source confirmed. Payment guard, delayed methods and buyer recovery remain code gaps. |

The audit did not reinstall and rebuild seven archived apps or retest every claimed assertion. It exercised the deployed read-only surfaces, checked immutable artifacts and external records, inspected actual pixels, and captured browser errors. New viewer integration tests cover this suite separately; they do not validate the generated shops' commerce logic.

## Token usage

Counts are provider-reported, not normalized billing units. Codex fresh input is total input minus cached input. Claude separately reports ordinary input, cache creation and cache reads; “fresh incl. write” adds ordinary input and cache creation. Output includes provider-accounted reasoning where reported.

| Run | Reported input | Cache read | Cache creation/write | Fresh incl. write | Output |
| --- | ---: | ---: | ---: | ---: | ---: |
| Astra | 5,556,682 | 5,410,816 | Not separately reported | 145,866 | 46,108 |
| Sol | 12,784,522 | 12,546,816 | Not separately reported | 237,706 | 46,630 |
| Terra | 4,399,211 | 4,263,168 | Not separately reported | 136,043 | 23,727 |
| Luna | 5,196,066 | 5,057,536 | Not separately reported | 138,530 | 28,631 |
| Fable | 1,282 | 3,570,149 | 148,803 | 150,085 | 85,289 |
| Opus | 252 | 9,642,272 | 169,335 | 169,587 | 106,980 |
| Sonnet | 284 | 13,435,604 | 165,936 | 166,220 | 78,616 |

## Complexity and maintenance

Counts include committed source under app/src/lib/components/pages/api with JS/TS/JSX/TSX/CSS extensions, including blank/comment lines, excluding configs, assets, lockfiles and generated output. Verification counts cover scripts/tests. Minified one-line code makes line counts a weak complexity proxy. Sol retains a large component scaffold, much of it outside the active shop flow.

| Run | Runtime files / lines | Verification files / lines | Maintenance concerns |
| --- | ---: | ---: | --- |
| Astra | 16 / 429 | 2 / 90 | Signed design, validation and recovery are useful; compact formatting and live-mode refusal need explicit handoff. |
| Sol | 72 / 8,265 | 0 / 0 | Large scaffold, server-font dependency, fallback fulfillment without paid regression proof. |
| Terra | 8 / 319 | 0 / 0 | Small surface, but missing durable order state, effective fit mapping and failure-status UI. |
| Luna | 10 / 367 | 0 / 0 | Small surface masks API-version mismatch, silent defaults and opaque artwork. |
| Fable | 24 / 2,244 | 1 / 40 | Elements plus express payment, callbacks and status recovery need comprehensive integration tests. |
| Opus | 18 / 2,079 | 0 / 0 | Custom font rasterizer, several variants and fulfillment fallback; fit ignored despite UI complexity. |
| Sonnet | 16 / 1,098 | 0 / 0 | Simple flow but payment guards, durable recovery and full-resolution transparent art are missing. |

## Human handoff: strengths and launch blockers

For **every run**: claim or migrate its private Stripe sandbox before expiration; create permanent production credentials; configure the actual store domain; register a live webhook with an explicit tested event version and matching secret; replace the Prodigi sandbox key/base with live settings only after a controlled rehearsal. Verify SKU/color/size/country availability, cost and margins, chosen print template, privacy/refund/contact/tax arrangements, receipt delivery, cancellation/refunds, duplicate delivery and supplier outages. Buy and inspect a physical sample. Sandbox completion and the viewer's green badge do not cover these requirements.

- **Astra — good:** outlined bundled font, signed timestamps, server-owned price, environment checks, durable receipt and repair route. **Blockers:** complete the unmodified hosted shipping/payment test; resolve the earlier retrying paid fixture; remove the explicit live-mode refusal only after the required production setup. Reconcile the fitted label with the unisex BC-3001 catalog description. Preserve `ARTWORK_SIGNING_SECRET`, `APP_URL` and `COMMERCE_MODE` semantics when migrating.
- **Sol — good:** distinct intended fit SKUs, paid guard, modern shipping fallback and buyer-triggered repair. **Blockers:** bundle/outline the print font, remove slogan, verify print scale on the deployed route, and complete an actual checkout. Harden trusted-origin handling; run duplicate/outage tests. Its standalone smoke request is not an integration pass.
- **Terra — good:** server-priced Checkout and final current shipping-field extraction. **Blockers:** timestamp-only print, real garment-fit mapping, paid integration test, durable order ID/error state and success UI that checks fulfillment. Correct the homepage hydration mismatch and validate Prodigi outcome/issues, not just HTTP status.
- **Luna — good:** deployed hosted Session creation, deterministic image route and a payment-checked callback fallback. **Blockers:** transparent legible timestamp artwork; correct garment fits; modern event shipping extraction and paid-state guard; pin/test webhook versions; persist fulfillment results. Prove both webhook-only and return-page recovery paths. Correct hydration and reject invalid choices rather than silently defaulting.
- **Fable — good:** correct paid fitted mapping, bundled-font printable timestamp, server price/address validation, succeeded-PI guard and recoverable receipt. **Blockers:** remove/reconcile failed localhost test artifacts, keep production artwork URLs public and stable, test duplicate creation/concurrent fulfillment/outages, review callback authentication, and validate the physical print template. Preserve `NEXT_PUBLIC_SITE_URL`/site configuration and matching Stripe keys during migration.
- **Opus — good:** server-frozen timestamp, transparent deterministic artwork, genuine hosted payment and fulfillment recovery. **Blockers:** map fitted to an actual fitted garment and verify every variant; test failures around best-effort PI receipt writes; validate rasterizer size and real physical placement instead of its assumed dimensions. Customer emails/receipts and shipment tracking need explicit verification.
- **Sonnet — good:** genuine payments and correct delivered assets for two color/size variants. **Blockers:** full-resolution transparent timestamp-only artwork; explicit paid guard/async payment handling; durable fulfillment status, error handling and recovery before promising shipment. Implement or explicitly remove the promised fitted option. Do not treat the social-preview image renderer as automatically suitable production print artwork.

## Viewer archive and capture provenance

Each run's `final.md` is copied verbatim from the result branch. The summary distinguishes those self-reports from independent findings. Primary images retain their original dimensions, color mode, alpha and pixel position. Private credentials, signed artwork URLs, claim links, raw API responses, transcripts and customer details are excluded from new viewer metadata and this report.

Fresh `storefront.png` captures use 1440×900, device scale 1, light mode, America/Los_Angeles, and no checkout submissions. Exact capture times, URLs, HTTP status, titles and errors are in `storefronts.json`. All seven screenshots succeeded; Terra and Luna publish no favicon. Only Fable and Sonnet publish a usable social-preview image; the other five have no image metadata. These are archived originals from homepage metadata, not invented substitutes. Sonnet's published preview uses its artwork renderer; this does not establish that any model generated a separate AI social illustration.

Suite permalink: `?suite=20260905-unserious-high`. Run permalinks add `&run=astra` (or sol, terra, luna, fable, opus, sonnet). Summary headings have stable `#summary-…` anchors. Missing metadata is reported explicitly rather than filled with another run's asset.
