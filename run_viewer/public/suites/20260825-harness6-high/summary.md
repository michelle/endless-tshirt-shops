# Six-model Prodigi benchmark — 2026-08-25

The runs were executed strictly one at a time. The original required order was
preserved—Claude Sonnet, Claude Opus, Codex Terra, Codex Sol, and Codex Luna—then
Claude Fable was appended as the sixth run. Every run used runner commit
`b8ae3ed`, prompt SHA-256 `4d3eb6c3…`, `high` reasoning, a distinct Vercel
project, and a distinct Stripe CLI profile. Each result was pushed to
`benchmark-results` and cleaned up before the next model started.

All six runner statuses are `succeeded`. That status means the agent exited
normally and its artifacts were published; it does not mean every customer or
print path was correct. Independent inspection found:

- Sonnet, Opus, and Fable completed paid Stripe purchases and delivered
  genuinely visible artwork to Prodigi.
- Terra never completed payment, and both of its direct Prodigi probe orders
  failed to download their artwork.
- Sol never completed payment; its direct Prodigi probe reached `Complete`, but
  the fetched 3600×1200 PNG was fully transparent.
- Luna never completed payment; its direct Prodigi probe reached `Complete`, but
  the 2400×3000 PNG contained only a 55×12-pixel mark and was not a meaningful
  shirt print.
- Fable's code and report claim provider idempotency, but its Prodigi request
  sends neither an `idempotencyKey` field nor an idempotency header. A race or a
  crash after order creation can therefore duplicate a shirt.

Treat these as directional case studies, not a formal model ranking.

## Overview

| Model | Reasoning | Runner status | Elapsed | Deployment | HTTP | Exact page title |
| --- | --- | --- | ---: | --- | ---: | --- |
| Claude Sonnet | High | Succeeded | 21m 15s | <https://benchmark-20260825-harness6-high-cl.vercel.app> | 200 | `datetime.store — a t-shirt with this exact moment on it` |
| Claude Opus | High | Succeeded | 81m 45s | <https://benchmark-20260825-harness6-high-cl-dusky.vercel.app> | 200 | `the datetime store` |
| Codex Terra (`gpt-5.6-terra`) | High | Succeeded; no paid/printable E2E | 9m 23s | <https://benchmark-20260825-harness6-high-co.vercel.app> | 200 | `datetime.store — a shirt from this moment` |
| Codex Sol (`gpt-5.6-sol`) | High | Succeeded; blank print asset | 16m 36s | <https://benchmark-20260825-harness6-high-co-kappa.vercel.app> | 200 | `datetime.store — Wear this exact moment` |
| Codex Luna (`gpt-5.6-luna`) | High | Succeeded; microscopic print asset | 17m 40s | <https://benchmark-20260825-harness6-high-co-iota.vercel.app> | 200 | `datetime.store — the current datetime, on a t-shirt` |
| Claude Fable 5 | High | Succeeded; idempotency defect | 35m 06s | <https://benchmark-20260825-harness6-high-cl-orcin.vercel.app> | 200 | `the datetime store` |

All canonical aliases returned HTML with a linked stylesheet during the
post-run audit. Several raw `metadata.json` deployment URLs contain trailing
Markdown text because the runner's URL extractor captured punctuation after the
URL; the table uses independently verified aliases.

## Framework and major technology choices

| Model | Framework and UI | Payment surface | Artwork and state |
| --- | --- | --- | --- |
| Sonnet | Next.js 16.3.2 App Router, React 19.2.8, TypeScript, Tailwind 4 | Stripe-hosted Checkout | `next/og` 1500×1878 PNG; Checkout Session metadata plus Prodigi result on the PaymentIntent; no database |
| Opus | Next.js 15.5.23 App Router, React 19.1, TypeScript, custom CSS | Address, Express Checkout, and Payment Elements backed by a PaymentIntent | `next/og` 3600×4800 PNG with bundled Chivo; PaymentIntent is the order record; in-process lock plus Prodigi idempotency |
| Terra | Next.js 14.2.35 Pages Router, React 18.3.1, JavaScript | Stripe-hosted Checkout | Server SVG at 4665×5844; Session metadata only; no order state persisted after Prodigi creation |
| Sol | Next.js 16.3.2 App Router, React 19.1, TypeScript, Zod, Sharp, Vitest | Stripe-hosted Checkout | Signed Sharp PNG intended as 3600×1200; Session/PaymentIntent shirt metadata; no stored fulfillment result |
| Luna | Static HTML/CSS/JavaScript with CommonJS Vercel Functions, Stripe, Sharp | Stripe-hosted Checkout | Signed 2400×3000 PNG; Checkout Session metadata stores the eventual order id; both styles map to one SKU |
| Fable | Next.js 15.5.23 App Router, React 19, TypeScript, Stripe.js 9 | Embedded Checkout (`embedded_page`), card only | `next/og` 2000×460 PNG with bundled Chivo; Session shirt metadata and Prodigi id on PaymentIntent; no database |

No runtime makes a Scalable Press network call. The only remaining mention is a
historical comment in Fable's product mapping.

## Stripe integration

### Sonnet

- **Integration:** hosted Checkout Session with an inline $22.50 USD item,
  address collection, and free shipping. It does not restrict payment methods,
  so the hosted page can expose methods enabled in the sandbox.
- **Observed objects:** 11 Sessions, of which 3 are complete/paid; 3 succeeded
  PaymentIntents; no Customers. `customer_creation` is omitted and the audited
  Sessions and PaymentIntents all have `customer: null`.
- **Metadata:** the Session stores `date`, `time`, `tz`, `style`, and `size`.
  It does not copy these values to the PaymentIntent. Successful fulfillment
  adds `prodigiOrderId` and `prodigiOutcome` to the PaymentIntent.
- **Webhooks:** one enabled endpoint at `/api/webhooks/stripe`, subscribed to
  `checkout.session.completed`.

### Opus

- **Integration:** Express Checkout and Payment Elements use a server-created
  $22.50 PaymentIntent with automatic payment methods and synchronous automatic
  capture. Address and receipt email are attached during confirmation.
- **Observed objects:** no Checkout Sessions; 14 PaymentIntents, including 10
  succeeded intents, 3 awaiting a payment method, and 1 canceled; no Customers.
  Eight real store PaymentIntents carry Prodigi order ids. One succeeded local
  payment records an unreachable-local-artwork error, and one succeeded intent
  is an explicit metadata probe.
- **Metadata:** `epoch_ms`, human-readable UTC value, `style`, `size`, SKU,
  immutable `artwork_url`, and source. Fulfillment adds `prodigi_order_id`,
  stage, completion time, or a bounded `fulfillment_error`.
- **Webhooks:** one enabled endpoint at `/api/webhooks/stripe`, subscribed to
  `payment_intent.succeeded`, `payment_intent.payment_failed`, and
  `charge.refunded`. Refunds are logged but do not cancel Prodigi orders.

### Terra

- **Integration:** hosted Checkout with a $22.50 inline item, required US
  shipping, free shipping, and `customer_creation: always`.
- **Observed objects:** 2 open/unpaid Sessions; no PaymentIntents or Customers.
  A Customer and PaymentIntent would only be created after Checkout completes.
- **Metadata:** Session-only `cut`, `size`, `timestamp`, and shop marker. It does
  not set `payment_intent_data.metadata` and does not write the Prodigi result
  back to Stripe.
- **Webhooks:** the signed `checkout.session.completed` route exists, but no
  endpoint is registered in this sandbox.

### Sol

- **Integration:** card-only hosted Checkout with a $22.50 inline item, free
  shipping to US/CA/GB/AU/NZ, `customer_creation: always`, and a Checkout
  idempotency key derived from timestamp/style/size.
- **Observed objects:** 3 open/unpaid Sessions; no PaymentIntents or Customers.
- **Metadata:** Session metadata stores timestamp, style, size, and origin;
  future PaymentIntent metadata repeats timestamp/style/size. The Prodigi order
  id is not persisted to Stripe.
- **Webhooks:** one enabled endpoint at `/api/webhooks/stripe`, subscribed to
  `checkout.session.completed` and `checkout.session.async_payment_succeeded`.

### Luna

- **Integration:** hosted Checkout with a $22.50 item, billing address, phone,
  free shipping to US/CA/GB/AU/NZ, and `customer_creation: always`.
- **Observed objects:** 4 open/unpaid Sessions; no PaymentIntents or Customers.
- **Metadata:** `stamp`, `style`, `size`, and a single `productSku`; fulfillment
  later adds `prodigiOrderId` to the Session.
- **Webhooks:** the signed route handles Checkout completion and async success,
  but no endpoint is registered in this sandbox.

### Fable

- **Integration:** card-only embedded Checkout Session with a $22.50 inline
  item and shipping collection across 19 countries.
- **Observed objects:** 14 Sessions, of which 1 is complete/paid; 1 succeeded
  PaymentIntent; no Customers.
- **Metadata:** Session and PaymentIntent store timestamp/style/size; the
  Session also stores origin. Fulfillment writes `prodigi_order_id` and stage to
  the PaymentIntent.
- **Webhooks:** two duplicate enabled endpoints point to `/api/stripe-webhook`,
  both subscribed to `checkout.session.completed`. The duplicate registration
  increases race pressure on code that lacks provider idempotency.

## Application flow and recovery behavior

All six place Prodigi orders only after Stripe reports payment as paid or
succeeded. None calls Prodigi before payment in its intended customer flow.

| Model | Exact runtime call order | Failure and recovery behavior |
| --- | --- | --- |
| Sonnet | Create hosted Checkout → payment → webhook retrieves Session → `POST /v4.0/Orders` → annotate PaymentIntent | Prodigi failures return HTTP 500 so Stripe retries. Session id is sent as Prodigi body `idempotencyKey`. Missing metadata/address is only logged and acknowledged, so those permanent data defects are not retried or surfaced. There is no success-page fallback or durable failed state. A mis-set public base URL produced a real `localhost` asset failure before a later deployment order succeeded. |
| Opus | Create PaymentIntent → client confirms → browser finalizer or webhook retrieves PI → `GET /v4.0/Orders?merchantReference=…&top=50` → if absent, `POST /v4.0/Orders` with `X-Idempotency-Key` → annotate PI; later status can `GET /v4.0/Orders/{id}` | Browser and webhook share the same path. In-process promise dedupe, PI metadata, remote merchant-reference recovery, and provider idempotency cover ordinary races and a crash after order creation. Errors are saved on the PI; webhook 5xx requests retry. Refund cancellation remains manual. |
| Terra | Create hosted Checkout → payment → success-page `POST /api/fulfill` or webhook retrieves Session → `POST /v4.0/Orders` | Body `idempotencyKey=session.id` protects retries. The success page reports a recoverable issue and the webhook returns non-2xx on failures. No order id or error is stored in Stripe, so support and status recovery require external lookup. Both actual probe orders failed asset download. |
| Sol | Create hosted Checkout → payment → webhook or success-page status retrieves Session → `POST /v4.0/Orders` | Body `idempotencyKey=session.id` protects provider retries. The success endpoint converts failures to HTTP 202 `processing`; the webhook returns non-2xx. No fulfillment state is persisted in Stripe, so the success page repeatedly calls Prodigi until it sees a response. The accepted direct probe contained blank artwork. |
| Luna | Create hosted Checkout → payment → success-page completion or webhook retrieves Session → `POST /v4.0/Orders` → write order id to Session metadata | Body idempotency key plus Session metadata cover sequential retries, though two server instances can race before metadata is written. Failure returns 502 to the success caller or non-2xx to Stripe. The accepted direct probe was not tied to a paid Session and contained a microscopic mark. |
| Fable | Create embedded Checkout → payment → webhook immediately or success-page fallback after 45 seconds → `POST /v4.0/Orders` → annotate PaymentIntent | Sequential calls stop when PI metadata already has an order id. Transient Prodigi exceptions make the webhook return 500. However, no Prodigi idempotency value is sent, `AlreadyExists` is treated as failure, and no remote lookup exists; a race or crash after creation can duplicate the order. Missing metadata/address/origin is returned as `state.error` but acknowledged by the webhook, preventing retry. |

## Design correctness and print proof

The audit fetched each representative source asset from the exact URL saved by
Prodigi, fetched the Prodigi-generated thumbnail when available, decoded the
RGBA pixels, measured the alpha bounds, and composited white-on-transparent art
over a dark proof background. This is stricter than accepting HTTP 200,
dimensions, or `downloadAssets: Complete`.

| Model | Real example | Source pixels and alpha bounds | Prodigi result | Print verdict |
| --- | --- | --- | --- | --- |
| Sonnet | `Mon Aug 24 2026` / `18:32:59.878` / `America/Los_Angeles`, order `ord_1168835` | 1500×1878 RGBA; 44,860 nontransparent pixels; bounds `(135,684)–(1365,1184)` | Asset and print-ready processing complete; thumbnail fetched | Genuinely visible multi-line design. An earlier order, `ord_1168834`, referenced `localhost` and failed download. |
| Opus | epoch `1787626519766`, paid PI ending `…bykB`, order `ord_1168848` | 3600×4800 RGBA; 238,637 nontransparent pixels; bounds `(621,944)–(2989,1155)`, about 7.89×0.70 inches at 300 DPI | Complete; thumbnail fetched | Genuinely printable and matches the frozen epoch. Shared preview/print geometry is the strongest implementation. |
| Terra | epoch `1780000000000`, order `ord_1168849` | Runtime endpoint returns a 4665×5844 SVG with white timestamp text | `downloadAssets: Error`, no thumbnail; `ord_1168850` failed the same way | No printable image reached Prodigi. Agent-reported order acceptance was only API acceptance. |
| Sol | epoch `1780000000999`, order `ord_1168851` | 3600×1200 RGBA; **0 nontransparent pixels**, no alpha bounds | Prodigi marked processing complete; thumbnail is pure white | Not printable. This is the clearest example of why provider completion and dimensions are insufficient. |
| Luna | epoch `1787600000000`, order `ord_1168853` | 2400×3000 RGBA; 416 nontransparent pixels; only a 55×12-pixel bound `(1171,1027)–(1226,1039)` | Complete; thumbnail is pure white | Technically nonempty but not a meaningful/readable garment print. |
| Fable | epoch `1787631309113`, paid PI ending `…FVma`, order `ord_1168854` | 2000×460 RGBA; 143,723 nontransparent pixels; bounds `(49,146)–(1955,314)` | Download and print-ready stages complete; thumbnail fetched | Genuinely visible and printable, but fulfillment duplication remains possible. |

Prodigi's 100-pixel JPEG thumbnails flatten transparency onto white. Even the
good white artwork is nearly invisible there; dark-background proofing was
necessary. Sol and Luna remained blank or effectively blank even after direct
RGBA inspection.

### When the design is frozen and where it persists

- **Sonnet:** client formats local date/time/timezone on Buy and sends those
  strings to Checkout metadata. The artwork URL contains those strings. The
  preview is not explicitly passed the frozen value before redirect, but the
  purchased strings are stable and reproducible.
- **Opus:** `Date.now()` is locked when the customer presses Buy. The same epoch
  drives preview geometry, PaymentIntent metadata, and deterministic artwork.
  The server rejects values older than 30 minutes or more than one minute in
  the future.
- **Terra:** the latest 50 ms ticker value is sent when Checkout starts and is
  stored on the Session. Validation accepts any 12–15 digit value; there is no
  freshness check.
- **Sol:** `Date.now()` is frozen on Buy and copied to Session and future
  PaymentIntent metadata. Validation requires a 13-digit range but does not
  require proximity to server time.
- **Luna:** `Date.now()` is frozen on Buy and stored on the Session. The server
  accepts a broad 2017–2096 range rather than checking freshness.
- **Fable:** `Date.now()` is frozen before embedded Checkout and persists on the
  Session, PaymentIntent, artwork URL, and Prodigi metadata. Any 13-digit epoch
  is accepted, including arbitrary historical/future values.

## Testing

| Model | Agent validation | Independent confirmation and gaps |
| --- | --- | --- |
| Sonnet | Next build, Playwright-hosted Checkout purchases, webhook replay, Prodigi order/idempotency checks | `npm ci`, lint, and production build passed independently; live page and webhook route responded correctly. Stripe confirms 3 paid Sessions and Prodigi confirms one good print plus one failed-localhost asset. No committed unit tests; malformed metadata is acknowledged without retry. |
| Opus | Typecheck/build, browser purchases, signed webhook tests, duplicate fulfillment, authorization checks, PNG bounds, and Prodigi status | Independent typecheck/build passed; live health checks all true; Stripe and Prodigi records confirm multiple paid, visible orders. No committed tests; `npm ci` reports 3 high-severity findings. Express wallets were not independently exercised. |
| Terra | Build/deploy, Checkout creation, direct Prodigi order submissions, attempted browser automation | Independent build passed and live page is reachable. Stripe confirms only unpaid Sessions; both Prodigi assets show `FailedToDownloaded`. No tests; `npm ci` reports 2 high-severity findings. |
| Sol | Tests, lint/build, Checkout Session creation, signed webhook/Prodigi direct test | Seven committed Vitest tests, lint, and build passed independently. Stripe has no paid payment; the direct Prodigi asset is fully transparent. Tests verify SVG text and response handling but do not decode the deployed PNG's alpha channel. |
| Luna | Syntax checks, deploy, Stripe Session creation, direct Prodigi submission | Independent syntax/test script and static build passed; live CSS is linked. No behavioral test suite or paid flow. Pixel inspection disproves the agent's artwork verification. |
| Fable | Build/deploy and a real headless-browser paid purchase through embedded Checkout to Prodigi | Independent build passed; Stripe/Prodigi confirm the paid order and visible artwork. Three E2E helper scripts are committed, but no unit tests. `npm ci` reports 3 high-severity findings. The duplicate-webhook and missing-idempotency race was not tested. |

The in-app browser surface was unavailable during the independent audit, so no
new storefront screenshots were captured. Live HTML, exact titles, stylesheet
links, public API responses, source review, Stripe objects, Prodigi records,
source artwork, provider thumbnails, and dark-background proofs were all checked
independently.

## Token usage

`Fresh input` is the normalized non-cache input figure recorded by the runner.
For Claude it includes cache creation; Codex does not expose a separate cache
creation number.

| Model | Fresh input | Cache reads | Cache creation/write | Output |
| --- | ---: | ---: | ---: | ---: |
| Claude Sonnet | 158,414 | 12,988,910 | 158,162 | 65,558 |
| Claude Opus | 257,698 | 23,181,632 | 257,422 | 166,492 |
| Codex Terra | 96,253 | 2,278,144 | Not reported | 18,117 |
| Codex Sol | 144,413 | 3,640,320 | Not reported | 37,028 |
| Codex Luna | 282,510 | 6,834,176 | Not reported | 45,760 |
| Claude Fable | 126,610 | 7,089,751 | 126,448 | 66,160 |

## Sanity-check isolation

Stripe isolation worked: every run created a different account and no Stripe
account contains another run's objects. Profiles remain permission-protected at
`.benchmark-secrets/stripe/<run-id>.toml`; no API credential is included in
this report or committed result. All six claimable sandboxes expire
2026-09-01, while the saved test keys report 2026-11-23 expiry.

| Model | Stripe account | Observed objects | Registered webhook | Claim URL |
| --- | --- | --- | --- | --- |
| Sonnet | `acct_1U7vv9CeeV02aI2l` | 11 Sessions; 3 paid PIs; 0 Customers | Enabled Checkout completion | [Claim Sonnet sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVTd2djlDZWVWMDJhSTJsLDE3ODgyMjUzODcv100qVqbdqBa) |
| Opus | `acct_1U7xs6B3POJgri70` | 14 PIs; 10 succeeded; 0 Customers | Enabled PI success/failure and refund | [Claim Opus sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVTd4czZCM1BPSmdyaTcwLDE3ODgyMjcyNDMv1005POYuPy0) |
| Terra | `acct_1U83yWKHZsTFzbde` | 2 unpaid Sessions; 0 PIs/Customers | None | [Claim Terra sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVTgzeVdLSFpzVEZ6YmRlLDE3ODgyMzE2MzMv100s33UKjDH) |
| Sol | `acct_1U89y88BwXfW1uMx` | 3 unpaid Sessions; 0 PIs/Customers | Enabled both Checkout completion events | [Claim Sol sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVTg5eTg4QndYZlcxdU14LDE3ODgyMzIyNDcv100xjfdicov) |
| Luna | `acct_1U870KBWI4fzh5Rp` | 4 unpaid Sessions; 0 PIs/Customers | None | [Claim Luna sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVTg3MEtCV0k0ZnpoNVJwLDE3ODgyMzMxOTkv100AexthdpI) |
| Fable | `acct_1U7uSE5AQQ7ZFAyZ` | 14 Sessions; 1 paid PI; 0 Customers | **Two duplicate** Checkout completion endpoints | [Claim Fable sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVTd1U0U1QVFRN1pGQXlaLDE3ODgyMzQzNjQv100gAWmZZxd) |

Prodigi was **not isolated**. All six runs used the same supplied sandbox API
key and shared one order history. Order ids are sequential across models, and a
late Opus recovery order (`ord_1168852`) appeared while later model runs were in
progress. The implementation attribution above uses Stripe references, order
merchant references, stored asset URLs, timestamps, and run timing—not account
separation.

Every hard-coded Prodigi SKU returned HTTP 200 from the sandbox product API:
Bella + Canvas 6004, Gildan 64000, Bella + Canvas 3001, Bella + Canvas 3003, and
Gildan 5000. That proves current sandbox catalog existence, not live-region
availability, margin, fit, or physical print placement.

## Model handoff to a human

### Sonnet

Claim or replace the sandbox; install live Stripe/Prodigi credentials; recreate
the Checkout-completion webhook in live mode; set `PUBLIC_BASE_URL` to the
canonical public domain; and order physical samples of both SKUs. Add a durable
fulfillment state/fallback so malformed data and post-payment permanent errors
cannot be silently acknowledged. Keep the successful 1500×1878 design, but
retest its physical size and localized timezone wording.

### Opus

Claim or replace the sandbox, switch both providers to live keys, recreate all
three webhook subscriptions, remediate the reported npm findings, and order
samples for Bella + Canvas 6004/3001. Add automatic/manual refund-to-cancel
operations, durable alerting/queueing beyond PaymentIntent metadata, tax, legal
pages, and a price/margin decision. The audited $22.50 price leaves little room
after printing, shipping, and Stripe fees.

### Terra

Do not launch the current fulfillment path. Fix why Prodigi could not download
the deployed SVG, prove a paid browser Checkout through to a visible thumbnail,
register the live webhook, store the order id/failure state, add timestamp
freshness checks, and remediate dependency findings. Reconfirm that Bella +
Canvas 3003's curved-hem garment is the intended unisex replacement.

### Sol

Do not launch until the Sharp artwork output is fixed and an alpha-content test
guards the deployed PNG. Then complete a paid Checkout, inspect the provider
thumbnail/dark proof, recreate the two webhooks in live mode, and persist
fulfillment state for support. Recheck physical SKU mapping, tax, margin,
shipping, and legal/support content. Existing tests need a real decoded-PNG
nontransparent-pixel assertion.

### Luna

Do not launch until the timestamp renders at a meaningful print size. Add a
pixel-bound regression test, complete a paid Checkout, and register both live
webhook events. Either map fitted and unisex to distinct verified SKUs or remove
the misleading fit choice; currently both purchase the Gildan 5000. Add
freshness validation, stronger concurrent idempotency, tax/legal/support work,
and physical samples.

### Fable

Before launch, add Prodigi `idempotencyKey` and/or the provider idempotency
header, accept `AlreadyExists`, and recover by merchant reference before
creating. Remove the duplicate Stripe endpoint, make invalid fulfillment data
produce an actionable retry/alert rather than HTTP 200, remediate npm findings,
then recreate a single live webhook. Replace provider credentials, validate
6004/3001 physically, enable tax/receipts as needed, and revisit free-worldwide
shipping at $22.50.

## Complexity

Physical lines below count runtime `.js`, `.ts`, `.tsx`, `.css`, and `.html`
under application source directories; they exclude locks, docs, generated
assets, and configuration. Test/verification lines are committed test or E2E
scripts only.

| Model | Runtime files | Runtime lines | Test/verification files | Test/verification lines | Maintenance profile |
| --- | ---: | ---: | ---: | ---: | --- |
| Sonnet | 14 | 1,042 | 1 | 69 | Moderate; simple hosted Checkout and webhook, but weak post-payment recovery |
| Opus | 25 | 2,841 | 0 | 0 | Highest implementation and operational complexity; strongest state/recovery and print geometry, but no committed regression suite |
| Terra | 9 | 237 | 0 | 0 | Smallest framework implementation; minimal state and diagnostics, with failed asset delivery |
| Sol | 18 | 681 | 3 | 62 | Moderate; best committed unit-test footprint, but tests miss the blank deployed raster |
| Luna | 9 | 172 | 0 | 0 | Small static/function surface; compactness hides product-mapping and raster correctness gaps |
| Fable | 13 | 1,296 | 3 | 203 | Moderate; embedded Checkout and useful E2E helpers, but unsafe fulfillment idempotency |

Operationally, every implementation still needs credential rotation, live-mode
webhook setup, physical SKU/print validation, margin/tax/legal decisions, and
support procedures. None includes a durable database-backed order console or
queue. Opus has the most complete failure-recovery design; Sonnet and Fable
proved a polished paid flow with visible art; the three Codex implementations
were faster but did not prove a paid printable customer flow in this run.
