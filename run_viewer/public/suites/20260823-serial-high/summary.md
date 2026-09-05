# Serial high-reasoning benchmark — 2026-08-23

The five runs were executed strictly in this order: Claude Sonnet, Claude Opus,
Codex Terra, Codex Sol, and Codex Luna. All used runner commit `8a52f74`, prompt
SHA-256 `5eebcabf…`, high reasoning, separate Vercel projects, and separate Stripe
CLI profiles. Each run completed with runner status `succeeded` and was pushed to
`benchmark-results` before the next run began.

“Succeeded” below is the runner result, not a claim that every integration was
validated end to end. Opus and Sol demonstrated a paid checkout with
production-sized artwork and a real Scalable Press test order. Sonnet placed test
orders using placeholder artwork. Terra and Luna created unpaid Checkout
Sessions but did not complete payment or place a print order.

## Overview

| Model | Reasoning | Status | Elapsed | Deployment | Page title |
| --- | --- | --- | ---: | --- | --- |
| Claude Sonnet (`claude-sonnet-5`) | High | Succeeded | 25m 45s | <https://benchmark-20260823-serial-high-clau.vercel.app> | `datetime.store — a t-shirt with the current datetime` |
| Claude Opus (`claude-opus-5`) | High | Succeeded | 83m 09s | <https://benchmark-20260823-serial-high-claude-opus.vercel.app> | `datetime.store — a t-shirt with the current datetime` |
| Codex Terra (`gpt-5.6-terra`) | High | Succeeded | 10m 42s | <https://benchmark-20260823-serial-high-code.vercel.app> | `datetime.store — a shirt from this exact moment` |
| Codex Sol (`gpt-5.6-sol`) | High | Succeeded | 31m 01s | <https://benchmark-20260823-serial-high-code-virid.vercel.app> | `datetime.store — wear this exact moment` |
| Codex Luna (`gpt-5.6-luna`) | High | Succeeded (unstyled deployment) | 8m 07s | <https://benchmark-20260823-serial-high-code-three.vercel.app> | `datetime.store — wear the moment` |

All five URLs returned HTTP 200 during the post-run audit. Luna's HTML omits a
stylesheet link even though `/styles.css` exists and returns HTTP 200, so its
deployed UI renders with browser-default styling. The raw
`deployment_url` values in several `metadata.json` files contain trailing
Markdown punctuation because of a runner extraction bug; the table uses the
independently verified canonical aliases.

## Framework and major technology choices

| Model | Framework and UI | Server/artwork | Operational state |
| --- | --- | --- | --- |
| Sonnet | Next.js 16.3.2 App Router, React 19.2.8, TypeScript, Tailwind 4, Stripe React SDK | Browser canvas produces a 1400×350 transparent PNG | PaymentIntent metadata only; no database, webhook, or queue |
| Opus | Next.js 16.3.2 App Router, React 19.2.8, TypeScript, Tailwind 4, Zod, Stripe Elements | `@napi-rs/canvas` renders a 2400×376 Chivo PNG; same TTF is used in the SVG preview | PaymentIntent metadata, page/webhook triggers, 90-second lease, ops endpoint, daily Vercel cron |
| Terra | Next.js 14.2.35 Pages Router, React 18.3.1, JavaScript, hosted Checkout | `@resvg/resvg-js` renders a server-side 1800×700 PNG from SVG | PaymentIntent metadata after Checkout; deployed with `SP_DRY_RUN=true` |
| Sol | Next.js 16.3.2 App Router, React 19.2, TypeScript, Zod, Sharp, hosted Checkout, Vitest/Playwright | Shared deterministic seven-segment geometry; 2400×720 server PNG with a bitmap caption | PaymentIntent metadata, page/webhook triggers, recoverable 120-second processing lease |
| Luna | Static HTML/CSS/JavaScript plus CommonJS Vercel Functions; only runtime dependency is Stripe | Browser canvas uploads an 1800×500 PNG before Checkout | Checkout Session metadata only; no database, queue, or processing lease expiry |

None of the implementations uses Stripe Elements backed by a Checkout Session.
Sonnet and Opus use Elements with PaymentIntents; Terra, Sol, and Luna redirect
to Stripe-hosted Checkout.

## Stripe integration

### Sonnet

- **Integration:** Payment Element + PaymentIntent.
- **Objects:** creates a `$22.50` USD PaymentIntent with
  `automatic_payment_methods.enabled=true` and `receipt_email`. It does not
  create a Customer; audited PaymentIntents have `customer: null`.
- **Metadata:** `orderToken`, `designId`, `style`, `size`, and `email`; successful
  fulfillment adds `spOrderId`. It does not store the literal timestamp or
  shipping address in Stripe.
- **Webhooks:** no webhook route and no registered endpoint. Fulfillment depends
  on the browser calling `/api/finalize-order` after `confirmPayment`.

### Opus

- **Integration:** Payment/Address/Express Checkout Elements + PaymentIntent.
- **Objects:** creates or reuses a `$22.50` USD PaymentIntent with description,
  `receipt_email`, automatic payment methods, and synchronous automatic capture.
  It does not create a Customer; all audited intents have `customer: null`.
- **Metadata:** `shirt_timestamp_ms`, `shirt_style`, `shirt_size`, JSON
  `ship_address`, `sp_design_id`, `sp_order_token`, `sp_cost_cents`, `sp_mode`,
  `fulfillment_state`, attempts/start/error fields, and finally `sp_order_id`.
- **Webhooks:** signed `payment_intent.succeeded` at `/api/stripe/webhook`. A live,
  enabled test endpoint was registered for the deployment. Other event types are
  acknowledged and ignored.

### Terra

- **Integration:** Stripe-hosted Checkout.
- **Objects:** creates a payment-mode Checkout Session with an inline `$22.50`
  line item, free US shipping, required billing and shipping addresses, phone
  collection, and `customer_creation: always`. A Customer and PaymentIntent are
  created only when Checkout completes; the audit found two open/unpaid Sessions
  and no PaymentIntents or Customers.
- **Metadata:** Session metadata has `product`, `style`, `size`, and `timestamp`;
  `payment_intent_data.metadata` repeats those and starts
  `fulfillment_status=pending`.
- **Webhooks:** signed `checkout.session.completed` only. The route exists, but no
  endpoint was registered in this sandbox.

### Sol

- **Integration:** Stripe-hosted Checkout.
- **Objects:** creates a payment-mode Checkout Session with an inline `$22.50`
  line item, free US shipping, US shipping-address collection, and
  `customer_creation: always`. Completed audit purchases created Customers and
  PaymentIntents. The Checkout creation uses an idempotency key based on frozen
  timestamp, fit, and size.
- **Metadata:** Session metadata has `fit`, `size`, `timestamp`, and
  `product_version`; PaymentIntent metadata starts with fit/size/timestamp and
  later stores `fulfillment_state`, `fulfillment_started_at`, `sp_design_id`,
  `sp_reference`, and any `fulfillment_error`.
- **Webhooks:** signed `checkout.session.completed` and
  `checkout.session.async_payment_succeeded` at `/api/webhooks/stripe`. A live,
  enabled test endpoint was registered for both events.

### Luna

- **Integration:** Stripe-hosted Checkout.
- **Objects:** creates a payment-mode Checkout Session with an inline `$22.50`
  line item, `customer_creation: always`, and shipping collection for US, CA, GB,
  and AU. The audit found three open/unpaid Sessions and therefore no Customers
  or PaymentIntents.
- **Metadata:** `style`, `size`, `design_id`, and
  `fulfillment_status=pending` live on the Checkout Session. The literal
  timestamp is not stored in Stripe.
- **Webhooks:** signed `checkout.session.completed` and
  `checkout.session.async_payment_succeeded` at `/api/stripe-webhook`. The route
  exists, but no endpoint was registered in this sandbox.

## Application flow and failure recovery

| Model | Exact Scalable Press order relative to payment | Recovery behavior |
| --- | --- | --- |
| Sonnet | Freeze/capture client PNG → `POST /v2/design` → `POST /v2/quote` → create and confirm PaymentIntent → `POST /v2/order` | Design/quote failure prevents payment. Post-payment order failure returns 502 but records no failure state and has no webhook/queue. A later manual API retry can work; `spOrderId` prevents ordinary sequential duplicates, but there is no concurrency lock. |
| Opus | Freeze timestamp/server render → `POST /v2/design` → `POST /v2/quote` → create/confirm PaymentIntent → page or webhook calls `POST /v2/order` | Validation failure stops before payment. Availability failure may deliberately proceed to payment in `deferred` mode, reconstruct design/quote later, and retry through the webhook, confirmation page, or daily cron. Permanent rejection becomes `failed`. A 90-second `placing` lease reduces duplicate work, though metadata updates are not an atomic lock. |
| Terra | Create Checkout Session → customer pays → in live mode `POST /v2/design` → `POST /v2/quote` → `POST /v2/order` | The deployed project uses `SP_DRY_RUN=true`, so after payment it skips every Scalable Press call and marks a synthetic `dry-run` order. In live mode failures become `failed`; webhook redelivery or the success page can retry. A crash after setting `processing` leaves the order stuck because that state has no expiry. |
| Sol | Create Checkout Session → customer pays → `POST /v2/design` → `POST /v2/quote` →, when `SP_PLACE_ORDERS=true`, `POST /v2/order` | The return page and signed webhook share fulfillment. Errors are saved as `failed` and a non-2xx webhook response requests redelivery. A `processing` attempt becomes retryable after 120 seconds. There is no durable queue or atomic provider idempotency key. |
| Luna | Freeze/capture client PNG → `POST /v2/design` → create Checkout Session → customer pays → `POST /v2/quote` → `POST /v2/order` | Design failure prevents Checkout. Quote/order failure sets `needs_attention`; webhook redelivery or the success-page fallback can retry. A crash after `processing` leaves the order permanently stuck. No deployed webhook was registered, and the tested quote path returned HTTP 500. |

## Design correctness

### Sonnet

The browser stops the same canvas used for the preview and uploads its PNG, so
the design itself is frozen before payment. Stripe persists only the Scalable
Press `designId` and `orderToken`, not the timestamp. This makes the uploaded
bitmap the sole authoritative copy and prevents server-side reconstruction.

The intended final design is a white 13-digit Unix-millisecond value on a
transparent 1400×350 image, eight inches wide on the front. However, every
audited test design was actually a 10×10 placeholder. The run proved payment and
ordering plumbing, not the final artwork.

### Opus

`Date.now()` is captured on Buy, freezes the preview, is validated for freshness,
and is persisted as `shirt_timestamp_ms`. The server—not the browser—renders the
same literal value with bundled Chivo Bold at 300 DPI and stores the resulting
design ID and quote token. This is reconstructable and resists client artwork
tampering.

An actual final design was a 2400×376 transparent PNG reading
`1787515560494`, for a black unisex L; it became Scalable Press test order
`6a8b52abbddbf01bc01e92b4`.

### Terra

The UI stops its timestamp when checkout starts. The value is persisted on both
the Checkout Session and future PaymentIntent, and live fulfillment regenerates
artwork from that value. The preview and print use different renderers, but share
the same string. Server validation checks only for 13 digits, not freshness, so a
caller can submit an arbitrary timestamp.

For example, one audited open Session stored `1787529600123` for a fitted M. No
paid Session reached design generation, and the deployed dry-run mode would not
create a real final design.

### Sol

The client captures `Date.now()` at Buy, freezes it, and the server rejects a
timestamp more than five minutes away. The same value is persisted on the
Session and PaymentIntent, then used to render deterministic seven-segment
artwork with the caption `THIS EXACT MOMENT`. The preview shares the segment
geometry, and the PaymentIntent stores the resulting design/order references.

An actual final design was a 2400×720 transparent PNG reading
`1787518006225` for a fitted M; it became Scalable Press test order
`6a8b5c460716651bd67f7a5a`.

### Luna

The client sets `state.timestamp=Date.now()`, immediately renders the human UTC
form plus `THIS MOMENT IS YOURS` into a canvas, and uploads it before creating
Checkout. The Scalable Press design ID freezes that bitmap. Stripe stores the
design ID but not the timestamp, so the value cannot be audited or regenerated
from Stripe and a failed/lost design cannot be rebuilt.

The intended final form is like `2026-08-23 21:00:12.405 UTC` on an 1800×500
transparent PNG. All three audited run artifacts were 1×1 placeholder images,
and no payment or quote completed, so the run did not demonstrate final artwork.

## Testing

| Model | Validation performed | Important gaps |
| --- | --- | --- |
| Sonnet | Built/typechecked through Next deployment; exercised the deployed create-intent, Stripe confirmation, `/api/finalize-order`, and a second idempotency call. Stripe independently shows succeeded intents and Scalable Press order IDs. | No automated test suite or browser checkout. The fulfilled test artwork was 10×10, not the app's 1400×350 timestamp canvas. No webhook recovery test because no webhook exists. |
| Opus | Ran typecheck/build, an 8-of-8 product/size quote matrix, production artwork endpoint checks, real browser purchases, an API-confirmed webhook-only purchase, repeated fulfillment, invalid-client-secret authorization, ops authentication/backlog, and screenshot/console checks. Stripe and SP records confirm multiple placed orders with 2400×376 art. | No unit-test runner. The 90-second lease is not an atomic lock, and the long-outage path was only lightly exercised. |
| Terra | Ran `npm run build`, deployed successfully, checked HTTP reachability, created and inspected two live `$22.50` Checkout Sessions, and attempted Playwright. | Browser automation was killed; both Sessions stayed unpaid. `SP_DRY_RUN=true` prevented deployed fulfillment testing. There is no test suite, and npm reported two high-severity dependency findings during the run. |
| Sol | Ran Vitest, TypeScript typecheck, production build, health/API checks, hosted Checkout browser automation, real sandbox payments, Scalable Press quote/order calls, idempotency/retry checks, and visual proof inspection. Stripe confirms three paid Sessions/PIs, two fulfilled orders, and one quote-only recovery artifact. | The Vitest suite contains only one product-contract test. Concurrency and durable replay are not proven. |
| Luna | Ran JavaScript syntax checks, dependency checks, live `/api/prepare-order`, Checkout creation, unpaid-completion rejection, order-status checks, SP design retrieval, and repeated quote probes. | No build/test scripts or browser payment. The deployed HTML never loads its existing `/styles.css`, so the site is unstyled. All Sessions remained unpaid, every uploaded test image was 1×1, and the SP quote returned HTTP 500, so order placement was not tested. |

## Token usage

`Fresh input` is normalized as input excluding cache reads. For Claude it
includes first-time cache creation; Codex did not report a separate cache-
creation category.

| Model | Fresh input | Cache reads | Cache creation | Output |
| --- | ---: | ---: | ---: | ---: |
| Claude Sonnet | 275,649 | 11,800,914 | 275,397 | 76,765 |
| Claude Opus | 452,759 | 23,693,670 | 452,296 | 185,229 |
| Codex Terra | 76,890 | 1,968,887 | Not reported | 19,010 |
| Codex Sol | 169,879 | 17,206,301 | Not reported | 64,477 |
| Codex Luna | 122,542 | 4,799,447 | Not reported | 37,799 |

## Sanity check: sandbox isolation

The hardened runner worked as intended. Each model created a different Stripe
account in its own profile, and no account contained another run's objects.
Every sandbox can be claimed through August 30, 2026; the saved test keys report
an independent November 21, 2026 expiry.

| Model | Stripe account | Observed test objects | Registered webhook | Claim URL |
| --- | --- | --- | --- | --- |
| Sonnet | `acct_1U7f04Ey8FLsPxWd` | 5 PIs; 3 succeeded, 2 with SP order IDs; no Checkout Sessions | None | [Claim Sonnet sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVTdmMDRFeThGTHNQeFdkLDE3ODgxMTQyNzQv100BfjXzmvz) |
| Opus | `acct_1U7MYGL68MTupEn6` | 9 PIs; 5 succeeded/placed; no Checkout Sessions | Enabled `payment_intent.succeeded` | [Claim Opus sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVTdNWUdMNjhNVHVwRW42LDE3ODgxMTU3MjAv100HzC7hNAU) |
| Terra | `acct_1U6g07PdjJkMgWqw` | 2 open/unpaid Checkout Sessions; no PI/Customer | None | [Claim Terra sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVTZnMDdQZGpKa01nV3F3LDE3ODgxMjA2NDcv100Zfyw8RYq) |
| Sol | `acct_1U7ZAD7houQ8g5SA` | 16 Sessions; 3 paid PIs/Customers; 2 SP orders and 1 quote-only result | Enabled both Checkout completion events | [Claim Sol sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVTdaQUQ3aG91UThnNVNBLDE3ODgxMjEzNTMv100KWICM2cT) |
| Luna | `acct_1U7fgfCZS4lD27oG` | 3 open/unpaid Checkout Sessions; no PI/Customer | None | [Claim Luna sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVTdmZ2ZDWlM0bEQyN29HLDE3ODgxMjMyMDAv100mZmKrxps) |

Local profiles remain at `.benchmark-secrets/stripe/<run-id>.toml`; no API keys
are included in this report or committed result.

## Model handoff to a human

### Sonnet

Claim the sandbox, replace Stripe and Scalable Press test credentials with live
credentials, verify both hard-coded garment IDs against the live SP catalog, and
run a real browser purchase using the app-generated 1400×350 artwork. Before
launch, add and register a signed `payment_intent.succeeded` webhook plus durable
retry/alerting. The 10×10 test artifact is not hard-coded in runtime code, so it
does not require a code edit; it does require a correct end-to-end retest.

### Opus

Claim the sandbox, set live Stripe/SP keys, create the equivalent live-mode
`payment_intent.succeeded` endpoint, re-run `verify:products`, and set/operate
`OPS_TOKEN`/`CRON_SECRET`. Add legal/returns content, alert on `failed`, review
price/margin, and consider a database/queue before volume. Runtime code contains
no hard-coded test key or placeholder artwork; sample cards, addresses, and
emails are confined to scripts/docs.

### Terra

Claim the sandbox, replace credentials, set `SP_DRY_RUN=false`, verify the two
hard-coded SP product IDs and artwork proof, register
`checkout.session.completed`, and complete a real browser payment. Fix the
non-expiring `processing` state before production. No secret is hard-coded, but
the dry-run environment setting and garment mappings are explicit launch gates.

### Sol

Claim the sandbox, replace credentials, recreate the two webhook subscriptions
in live mode, enable live SP ordering only after product/inventory/margin checks,
and add durable queueing/operations for scale. Replace placeholder support/legal
details. The verified timestamp artwork is generated by runtime code; test card,
address, and email values live only in the E2E script.

### Luna

Claim the sandbox, replace credentials, fix and verify the SP quote/product path,
register both Checkout completion webhooks, and complete a real browser payment
with a production-size design. Add
`<link rel="stylesheet" href="/styles.css">` to `public/index.html`, persist the
timestamp itself, add an expiring processing lease/queue, and reconcile the four
allowed shipping countries with actual fulfillment support. The 1×1 probe is not
hard-coded in runtime code, but the app still needs a genuine styled browser and
artwork/payment/order test before launch.
