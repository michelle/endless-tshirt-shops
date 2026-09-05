# datetime.store seven-model benchmark — high reasoning

Run date: 2026-09-04 PDT / 2026-09-05 UTC<br>
Results branch: `benchmark-results`<br>
Reasoning level: `high` for every attempt

This is an informal set of directional case studies, not a formal ranking. “Runner succeeded” means the model process exited zero and the harness committed its artifact. “Audited outcome” below is stricter: it reflects independent inspection of the deployed site, Stripe account, Prodigi orders, generated pixels, and committed code.

The exact submitted print canvases are easier to compare in the [black-background artwork gallery](./20260904-harness7-high-gallery.html).

## Overview

| Model | Run | Runner | Audited outcome | Time | Commit | Deployment | HTTP / exact title |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| GPT-6 Astra | `20260904-harness7-high-codex-astra` | succeeded | **Complete end to end** | 1,481 s | `bfb158f` | <https://benchmark-20260904-harness7-high-co-amber.vercel.app> | 200 · `datetime.store — Wear this very moment.` |
| GPT-5.6 Sol | `20260904-harness7-high-codex-sol` | succeeded | **Partial: microscopic print defect; no paid deployed checkout** | 1,462 s | `172910f` | <https://benchmark-20260904-harness7-high-co-rouge.vercel.app> | 200 · `datetime.store — A timestamp you can wear` |
| GPT-5.6 Terra | `20260904-harness7-high-codex-terra` | succeeded | **Partial: no app artwork reached Prodigi; no paid deployed checkout** | 784 s | `f546b3d` | <https://benchmark-20260904-harness7-high-co.vercel.app> | 200 · `datetime.store — Wear the moment` |
| GPT-5.6 Luna | `20260904-harness7-high-codex-luna` | succeeded | **Partial: direct Prodigi test only; no completed Stripe payment** | 1,738 s | `754ba6e` | <https://benchmark-20260904-harness7-high-co-sigma.vercel.app> | 200 · `datetime.store — the present, printed.` |
| Claude Fable 5.1 | `20260904-harness7-high-claude-fable-5-1-retry1` | succeeded | **Complete end to end on retry** | 1,660 s | `7ea8fde` | <https://benchmark-20260904-harness7-high-cl-one.vercel.app> | 200 · `the datetime store` |
| Claude Opus 5 | `20260904-harness7-high-claude-opus-5` | succeeded | **Complete end to end** | 1,750 s | `48235ff` | <https://benchmark-20260904-harness7-high-cl-livid.vercel.app> | 200 · `datetime.store` |
| Claude Sonnet 5 | `20260904-harness7-high-claude-sonnet-5` | succeeded | **Complete end to end** | 1,558 s | `0ac214e` | <https://benchmark-20260904-harness7-high-cl-fawn.vercel.app> | 200 · `datetime.store — a t-shirt with the current datetime` |

Fable’s preserved first attempt, `20260904-harness7-high-claude-fable-5-1` (`c9607ad`, 1,256 s), built and deployed but never obtained a Stripe account because `stripe sandbox create` repeatedly returned HTTP 429. The harness called it succeeded because the agent exited zero. It is an incomplete attempt under the product criteria. The later retry used a fresh run ID, preserving the first artifact for auditability.

The models executed serially in this actual order: Terra, Fable first attempt, Astra, Sonnet, Luna, Opus, Sol, then Fable retry. The caller’s expansion from the five-model harness prompt to seven models overrode the prompt’s original roster/order.

## Frameworks and major choices

| Model | Framework | Payment UI | Fulfillment state | Notable choices |
| --- | --- | --- | --- | --- |
| Astra | Next.js 15.5 / React 19 / TypeScript; Sharp + opentype.js + Zod | Hosted Stripe Checkout | Checkout Session metadata | Explicit capture/review, strict metadata schema, server-rendered 300 dpi PNG, manual retry endpoint |
| Sol | Next.js 16.3 / React 19 / TypeScript; Sharp | Hosted Stripe Checkout | Prodigi idempotency only | Webhook plus server-rendered success-page fallback; fixed single Bella+Canvas product |
| Terra | Next.js 15.5 / React 19 / TypeScript | Hosted Stripe Checkout | None after POST | Very small implementation; webhook-only fulfillment; SVG artwork |
| Luna | Next.js 16.3 / React 19 / TypeScript; PNGJS | Hosted Stripe Checkout | Checkout Session metadata | Webhook plus client `/api/fulfill` fallback; many unused Cloudflare/Vite/Drizzle dependencies remain |
| Fable 5.1 retry | Next.js 16.3 / React 19 / TypeScript; Stripe React SDK | In-page Payment Element + Express Checkout, deferred PaymentIntent | PaymentIntent metadata | Stripe as datastore, webhook plus client fast path, Prodigi callback, deterministic artwork URL |
| Opus 5 | Next.js 15.5 / React 19 / TypeScript | Hosted Stripe Checkout | PaymentIntent metadata | Webhook plus order-status backstop; client-side scan for Prodigi merchant reference recovery |
| Sonnet 5 | Next.js 16.3 / React 19 / TypeScript / Tailwind | Hosted Stripe Checkout | PaymentIntent metadata | Webhook-only fulfillment, deterministic `next/og` print image, lean codebase |

No runtime code calls Scalable Press. Opus contains one explanatory comment saying Prodigi replaces it; that is not an integration.

## Stripe audit

The Stripe CLI was queried directly through each saved run-specific profile. Counts are the account state at audit time. No model created a Stripe Customer; all seven accounts report zero Customers.

| Model | Stripe account | PaymentIntents | Checkout Sessions | Paid deployed-flow evidence | Registered deployed webhook |
| --- | --- | ---: | ---: | --- | --- |
| Astra | `acct_1UC3qMEGIg356IKV` | 1 / 1 succeeded | 1 / 1 paid | Yes; $36 paid Session, design metadata and deployed success URL | `/api/webhooks/stripe`; `checkout.session.completed`, `checkout.session.async_payment_succeeded` |
| Sol | `acct_1UC7BOK5czS5pbqi` | 2 / 2 succeeded | 4 / 2 paid | **No.** Both paid Sessions use `httpbin.org`; deployed $24 Session is open/unpaid | `/api/webhooks/stripe`; completed + async succeeded |
| Terra | `acct_1UC4QyLJ4s1pBqwl` | 1 / 1 succeeded | 2 / 1 paid | **No.** Paid Session uses `httpbin.org`; deployed Session is open/unpaid | `/api/stripe-webhook`; completed only |
| Luna | `acct_1UC9Qd9wV9Mdv25P` | 0 | 6 / 0 paid | **No.** All six Sessions are open/unpaid | `/api/webhooks/stripe`; completed only |
| Fable retry | `acct_1UC4BVCtaN1Uz7LG` | 7 / 6 succeeded | 0 | Yes; deployed Elements payment and webhook-only payment both succeeded | `/api/stripe/webhook`; `payment_intent.succeeded` |
| Opus | `acct_1UC85QRRWwqthcPN` | 3 / 3 succeeded | 5 / 3 paid | Yes; three deployed Checkout purchases | `/api/webhooks/stripe`; completed + async succeeded |
| Sonnet | `acct_1UC3P5D1YlFM2uR6` | 2 / 2 succeeded | 15 / 2 paid | Yes; two deployed Checkout purchases | `/api/webhooks/stripe`; completed + async succeeded |

Fable also left an enabled placeholder webhook at `https://example.com/api/stripe/webhook`; it should be removed. The deployed endpoint is separately registered and enabled.

The hosted-Checkout implementations create inline Prices through `price_data`; none creates persistent Products, Prices, or Customers. Design fields are placed in Checkout Session metadata and, except Terra/Luna, also copied to or reconciled through PaymentIntent metadata. Fable creates PaymentIntents directly with automatic payment methods, shipping, receipt email, SKU, artwork URL, and the frozen design in metadata.

### Saved profile isolation

Every conclusive run has a distinct Stripe account ID and its own mode-0600 local profile at:

` .benchmark-secrets/stripe/<run-id>.toml `

Each profile contains a `sandbox_claim_url`, expires on **2026-09-12**, and is intentionally untracked. The failed first Fable profile contains no account or credentials. The actual claim URLs are not copied into this public report; use the saved files directly:

```bash
stripe --config .benchmark-secrets/stripe/20260904-harness7-high-codex-astra.toml sandbox claim
# Repeat with the run ID for each sandbox you want to keep.
```

The harness enforced this isolation by removing ambient Stripe keys, quarantining the normal global CLI config, and wrapping every `stripe` invocation with a run-specific `--config`. No successful runs shared a Stripe sandbox.

Prodigi is different: every run used the same caller-supplied sandbox credential and therefore the same Prodigi account/order list. `merchantReference`, `idempotencyKey`, Stripe IDs, asset hostnames, and creation timestamps were used to attribute orders. Prodigi state was shared; Stripe state was not.

## Payment-to-Prodigi application flows

All Prodigi calls use v4.0 sandbox endpoints. No live order was placed.

### Astra

1. Browser freezes a 13-digit timestamp during capture/review.
2. Server validates fit, size, timestamp, UUID request ID, and creates a Checkout Session with the design in metadata.
3. Signed `checkout.session.completed` or `checkout.session.async_payment_succeeded` calls `fulfillCheckout` only after `payment_status=paid`.
4. The server retrieves the Session, validates metadata/shipping, then `POST`s `/v4.0/orders` with a SHA-256 idempotency key and deterministic `/api/artwork/<timestamp>.png`.
5. The Prodigi order ID is saved back to Checkout Session metadata. Duplicate calls short-circuit; failure sets `fulfillment_status=retry_needed`, returns HTTP 500 for Stripe retry, and the private order page exposes a manual POST retry.

Independent result: Session `cs_test_a1V3…` is paid; Prodigi `ord_1170396` references that Session, has zero issues, and downloaded the deployed artwork.

### Sol

1. Buy freezes `capturedAt`; `/api/checkout` validates it and creates a hosted Session.
2. Signed completed/async-succeeded webhook calls `fulfillCheckoutSession`; the success page invokes the same function as a fallback.
3. The function requires a paid Session and shipping details, then `POST`s `/v4.0/orders` with `datetime-store-<session>` idempotency.
4. Failures throw, yielding webhook retry or a visible failure on the success page. The order ID is not persisted in Stripe; recovery depends entirely on Prodigi idempotency.

Independent result: `ord_1170430` corresponds to a paid API smoke-test Session whose success/cancel URLs point to `httpbin.org`, not a deployed user checkout. Prodigi downloaded the generated file, but the file is unusable because the ink is microscopic.

### Terra

1. Browser passes the current timestamp/style/size to hosted Checkout; the server validates and stores them in Session metadata.
2. Only a signed `checkout.session.completed` event can fulfill.
3. The webhook requires paid status and shipping, then `POST`s `/v4.0/Orders` with the Stripe event ID as idempotency key and an SVG artwork URL.
4. A Prodigi error returns HTTP 502 so Stripe can retry; no order ID or durable state is written back to Stripe, and there is no success-page fallback.

Independent result: the deployed Session is unpaid. The run’s separate Prodigi verification order `ord_1170394` used an external sample image rather than the app-generated SVG and now reports `downloadAssets=Error`. No Prodigi order contains Terra’s generated artwork URL.

### Luna

1. Browser freezes `Date.now()` and creates hosted Checkout with `style`, `size`, and `timestampMs` metadata.
2. A signed `checkout.session.completed` webhook calls `fulfillSession`; the return page also POSTs `/api/fulfill` as a backstop.
3. The function retrieves the Session, requires paid status and shipping, then `POST`s `/v4.0/Orders` using `datetime-<session>` for merchant reference and idempotency.
4. Success stores `prodigi_order_id` on the Session. Failures return a structured “needs attention” result, but the webhook route does not catch failures around fulfillment, so transient exceptions become server errors and Stripe retries.

Independent result: all six Sessions are unpaid, so neither application path was proven. `ord_1170400` and `ord_1170401` are direct Prodigi integration checks with synthetic merchant references; their generated assets downloaded correctly.

### Fable 5.1 retry

1. Buy freezes a timestamp; server validation allows only a recent moment and builds a deferred PaymentIntent for Elements/Express Checkout.
2. The PaymentIntent stores style, size, timestamp, SKU, shipping, and exact artwork URL.
3. Signed `payment_intent.succeeded` invokes `ensureFulfilled`; a post-confirmation client call invokes the same function as a fast-path/backstop.
4. The function checks existing PaymentIntent metadata, then `POST`s `/v4.0/orders` with the PaymentIntent ID as merchant reference and idempotency key.
5. It saves order ID/status/errors into PaymentIntent metadata. `GET /orders/<id>` refreshes Prodigi status. A Prodigi callback also writes status to Stripe. Failures are recorded and remain retryable rather than silently discarded.

Independent result: `ord_1170433` is tied to the real browser payment and `ord_1170434` to a webhook-only payment; both downloaded their deployed art with zero issues. An earlier local-artwork smoke order, `ord_1170432`, could not fetch localhost and is not counted as success.

### Opus 5

1. Buy freezes a recent browser timestamp; Checkout creation writes style/size/timestamp to both Session and PaymentIntent metadata.
2. Signed completed/async-succeeded events retrieve the Session with expanded PaymentIntent and invoke `fulfilSession`.
3. The function checks PaymentIntent metadata, validates shipping/design, then `POST`s `/v4.0/Orders` with the Session ID as idempotency key.
4. It records the order ID or failure on the PaymentIntent. The order-status endpoint invokes the same function as a paid-return backstop. If metadata writing loses a race, recovery scans `/v4.0/Orders?top=<n>&skip=<n>` and matches `merchantReference` client-side.

Independent result: three deployed Checkout Sessions are paid and map to `ord_1170402`, `ord_1170403`, and `ord_1170404`; all three downloaded their art with zero issues.

### Sonnet 5

1. Client freezes the timestamp and creates hosted Checkout; style/size/timestamp are stored on Session and PaymentIntent metadata.
2. Signed completed/async-succeeded events call `fulfillCheckout` only for paid Sessions.
3. The webhook checks PaymentIntent metadata, then `POST`s `/v4.0/Orders`; successful order ID/status are saved on the PaymentIntent.
4. Prodigi/network errors return HTTP 500 for Stripe retry. `/api/order-status` is read-only; it does not provide a return-page fulfillment backstop.

Independent result: the paid deployed Session maps to `ord_1170399`, which downloaded the exact artwork with zero issues. The request does not send a Prodigi `idempotencyKey`; the PaymentIntent metadata guard reduces duplicates but leaves a concurrency window before that metadata write completes.

## Design correctness and printable-image audit

For every raster asset below, the exact URL recorded by Prodigi was downloaded, decoded, and inspected. Alpha pixels were counted, their exclusive bounding box measured, the image composited onto a dark shirt-like proof, and the corresponding Prodigi-generated thumbnail fetched and viewed. This goes beyond trusting `assetStatus`, HTTP status, or nominal dimensions.

| Model / example | Prodigi order | Image | Nontransparent pixels | Ink bounds `(left, top, right, bottom)` | Visual result |
| --- | --- | --- | ---: | --- | --- |
| Fable · `1788583053423` | `ord_1170433` | 4680×5790 RGBA PNG | 451,730 (1.6671%) | `(693, 867, 3977, 1409)` | Clear large timestamp plus UTC line, high on canvas |
| Opus · `1788579892691` | `ord_1170404` | 2800×3508 RGBA PNG | 176,092 (1.7928%) | `(396, 773, 2407, 952)` | Clear large timestamp, upper quarter |
| Sonnet · `1788576342212` | `ord_1170399` | 1600×2000 RGBA PNG | 50,297 (1.5718%) | `(128, 781, 1472, 1219)` | Readable centered lockup with magenta rules |
| Astra · `1788574243197` | `ord_1170396` | 4677×5881 RGBA PNG | 153,742 (0.5590%) | `(1154, 831, 3518, 1054)` | Clear timestamp, high on canvas |
| Luna · `1778112345678` | `ord_1170401` | 4677×5787 RGBA PNG | 557,024 (2.0580%) | `(546, 1780, 4130, 2144)` | Clear geometric timestamp, upper-middle; direct test only |
| Sol · `1788581161904` | `ord_1170430` | 4680×5790 RGBA PNG | **786 (0.0029%)** | `(2242, 2418, 2342, 2431)` | **Defective: only a 100×13-pixel dash is visible** |
| Terra · `1788571859184` | none | 4665×5844 SVG | n/a | text centered at `(2332.5, 2922)` | Candidate is readable on black, but Prodigi never received it |

The Prodigi thumbnails use white backgrounds, so white ink appears nearly blank there. The dark proof confirms substantive content for Fable, Opus, Sonnet, Astra, and Luna. Sol remains essentially blank on both backgrounds. Terra has no Prodigi thumbnail for its app artwork.

All seven implementations freeze a client-visible timestamp at or immediately before checkout creation and persist it in Stripe metadata. The stronger implementations—Astra, Fable, Opus, and Sonnet—also maintain a direct metadata link from payment to fulfillment state. Artwork URLs are deterministic from the stored timestamp, allowing exact regeneration.

## Testing

| Model | Agent-reported validation | Independent validation |
| --- | --- | --- |
| Astra | Five tests, build, dependency audit, paid checkout, duplicate submission | Clean install, build and tests pass; paid Stripe Session, webhook, Prodigi order and pixels confirmed |
| Sol | Tests, lint, build, Stripe/Prodigi server tests | Clean install/build/tests pass; deployed page 200. Paid deployed UI flow not present; severe artwork defect found |
| Terra | Build, Session creation, Stripe event, Prodigi acceptance | Clean install/build pass; no test suite. Deployed page 200; only deployed Session unpaid; Prodigi sample download failed |
| Luna | Build/lint, Checkout creation, signed webhook, direct Prodigi test | Clean install/build pass; committed `npm test` fails because it references missing `dist/server/index.js` and deleted `_sites-preview` files. No paid Stripe object |
| Fable retry | Playwright browser purchase, webhook-only path, health/assets | Clean install/build pass; no unit-test script. Stripe payments, webhook registrations, Prodigi orders, thumbnails and pixels confirmed |
| Opus | Ten logic tests, build, three Playwright purchases, idempotency | Clean install/build/tests pass; all three payments/orders and images independently confirmed |
| Sonnet | Build/lint and real browser purchase | Clean install succeeds. Build intentionally fails without `STRIPE_SECRET_KEY` because the module throws during collection; it passes with placeholder build-time configuration. No committed tests. Payment/order/image independently confirmed |

The browser purchase scripts were not rerun during audit to avoid creating more Stripe/Prodigi artifacts. The independent check instead queried the providers’ saved state and fetched the exact public assets. No physical garment was printed; sandbox completion cannot validate fabric, ink, cropping, or real-world placement.

## Token usage

“Fresh input” is the adapters’ recorded `new_input_tokens`. Claude separately reports cache creation/write; Codex does not expose an equivalent field in these artifacts.

| Model | Fresh input | Cache read | Cache creation/write | Output |
| --- | ---: | ---: | ---: | ---: |
| Astra | 157,155 | 5,187,840 | n/a | 37,528 |
| Sol | 260,173 | 15,090,560 | n/a | 48,545 |
| Terra | 134,895 | 3,732,480 | n/a | 23,757 |
| Luna | 265,488 | 15,644,416 | n/a | 58,432 |
| Fable retry | 184,203 | 4,115,287 | 182,921 | 106,855 |
| Opus | 149,111 | 8,147,333 | 148,941 | 92,380 |
| Sonnet | 188,882 | 15,135,422 | 188,632 | 66,593 |

The failed first Fable attempt used 165,242 fresh input, 4,679,158 cache-read, 163,668 cache-creation, and 92,868 output tokens.

## Complexity

Runtime counts include source under `app`, `src`, `components`, and `lib`; verification counts include `tests` and `scripts`. Generated lockfiles/assets are excluded. Astra’s unusually low line count reflects densely minified one-line source and should not be interpreted as simplicity.

| Model | Runtime files / lines | Test & verification files / lines | Maintenance notes |
| --- | ---: | ---: | --- |
| Astra | 17 / 163 | 7 / 82 | Strict and resilient, but heavily minified source is difficult to review and maintain |
| Sol | 13 / 521 | 1 / 17 | Moderate size and simple flow; lacks stored fulfillment state and has a critical artwork test gap |
| Terra | 7 / 200 | 0 / 0 | Smallest implementation; correspondingly few recovery/observability safeguards |
| Luna | 10 / 566 | 1 / 91 | Runtime is small, but dependency set is disproportionately large and the test script is stale/broken |
| Fable retry | 25 / 2,220 | 1 / 152 | Largest runtime; broadest operational surface (Elements, callback, order API, browser verifier) |
| Opus | 22 / 1,934 | 1 / 104 | Most elaborate recovery logic; higher code volume but good idempotency and verification depth |
| Sonnet | 14 / 997 | 0 / 0 | Lean and readable; no tests, build-time env coupling, and incomplete concurrency idempotency |

## Human handoff

Do these before accepting real customers:

1. **Claim only the sandboxes you intend to keep before 2026-09-12.** Use the saved local profile paths above. Delete/disable the rest, including Fable’s `example.com` placeholder webhook.
2. **Select one implementation after fixing its audited defects.** Astra, Fable retry, Opus, and Sonnet have the strongest end-to-end evidence. Do not ship Sol’s artwork renderer, Luna’s flow, or Terra’s fulfillment path as-is.
3. **Move Stripe to a permanent live project.** Replace publishable/secret keys, register the chosen production webhook and exact events, enable the desired payment methods, configure taxes/receipts/refunds, and verify signatures with the live endpoint secret.
4. **Move Prodigi to live deliberately.** Replace the shared sandbox key, select the live API hostname, add billing, verify the chosen garment SKU/attributes in the destination regions, and place a physical sample order. Luna hard-codes the sandbox Orders URL and requires a code change, not only an environment change.
5. **Fix model-specific blockers.** Sol must correct artwork scaling and add a minimum visible-bounds test. Terra needs a real paid-flow test, an actual Prodigi submission of its SVG (or a supported raster), durable order state, and public callback verification. Luna needs a real paid Checkout, repaired tests, and removal of unused platform dependencies. Sonnet should defer env validation until request time and send a Prodigi idempotency key. Fable should remove the placeholder webhook. Opus/Astra should be reformatted before maintenance; Astra especially needs its minified code expanded.
6. **Reconcile test artifacts.** Cancel or ignore sandbox orders, remove temporary Vercel projects you do not need, and do not interpret sandbox `Complete` shipping as a physical shipment.
7. **Add production operations.** Use a database/queue for durable order state, alert on webhook/fulfillment failures, ingest Prodigi callbacks, expose an authenticated admin view, send customer fulfillment/tracking email, publish policies/support contacts, and configure a custom public domain.
8. **Validate economics and print.** Requote every chosen SKU/shipping region, include Stripe fees/tax/returns, inspect the actual garment and DTG placement, and confirm that white artwork is visible in merchant tooling that previews on white.

## Bottom line

Four conclusive artifacts—Astra, Fable 5.1 retry, Opus 5, and Sonnet 5—demonstrated a paid deployed flow that produced readable artwork in Prodigi. Luna demonstrated a readable direct Prodigi integration but no payment. Sol demonstrated provider connectivity but submitted nearly blank print art. Terra demonstrated a deploy and Checkout creation but not working end-to-end fulfillment. These are case-study outcomes, not a quality ranking independent of the task and its one-run conditions.
