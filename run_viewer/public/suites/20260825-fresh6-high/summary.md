# Fresh six-model Prodigi comparison — 2026-08-25

These are fresh runs from runner commit `d78bcf2`, executed one model at a time
at high reasoning. The model order was Claude Sonnet, Claude Opus, Claude
Fable, Codex Terra, Codex Sol, and Codex Luna. Fable completed its model turn
but exposed a runner publication bug: its cloned reference repository contained
pre-existing trailing whitespace, so the runner's repository-wide
`git diff --check` failed after the model had finished. That residue then caused
the first Terra, Sol, and Luna invocations to fail the clean-worktree preflight;
no model process started in those attempts. After preserving Fable's artifacts
and cleaning the worktree, Terra, Sol, and Luna were run for real, still
serially, under `fresh6b` IDs.

Runner success only means an agent result was published. Independent checks
below distinguish Stripe payment, Prodigi API acceptance, asset download, and
actually readable print artwork. Treat the results as directional case studies,
not a formal ranking.

## Overview

| Model | Reasoning | Status | Elapsed | Deployment | HTTP | Exact page title |
| --- | --- | --- | ---: | --- | ---: | --- |
| Claude Sonnet 5 | High | Failed: no final message or deployment | 19m 24s | None | — | — |
| Claude Opus 5 | High | Failed: Claude API operation timed out | 10m 15s | None | — | — |
| Claude Fable 5 | High | Model succeeded; runner publication failed after completion | 34m 15s | <https://benchmark-20260825-fresh6-high-clau.vercel.app> | 200 | `datetime.store` |
| Codex Terra (`gpt-5.6-terra`) | High | Succeeded; no paid or actual tee order | 9m 59s | <https://benchmark-20260825-fresh6b-high-cod.vercel.app> | 200 | `datetime.store — a moment you can wear` |
| Codex Sol (`gpt-5.6-sol`) | High | Succeeded; direct Prodigi probe, but broken print text | 12m 46s | <https://benchmark-20260825-fresh6b-high-cod-tau.vercel.app> | 200 | `datetime.store — Wear this exact moment` |
| Codex Luna (`gpt-5.6-luna`) | High | Succeeded; paid flow, but broken print text and shared Stripe sandbox | 34m 20s | <https://benchmark-20260825-fresh6b-high-codex-luna-le53x1f9w.vercel.app> | 200 | `datetime.store — the shirt with the current time` |

All four deployments currently return HTML with a linked stylesheet. Sonnet
and Opus stopped before deployment. Fable's result is preserved in local
stashes rather than `benchmark-results` because of the runner failure.

## Framework and major technology choices

| Model | Framework/UI | Payment surface | Artwork/state |
| --- | --- | --- | --- |
| Sonnet | Next.js 16.3.3 App Router, React 19.2.8, TypeScript, Tailwind 4 | Intended Stripe-hosted Checkout | `next/og` artwork; Session and PaymentIntent metadata; incomplete—no fulfillment route or success page |
| Opus | Partial Next.js 15.1.6/React 19 TypeScript skeleton | Intended Payment Element/PaymentIntents, but no page or PI route was completed | Partial artwork, Stripe, catalog, and Prodigi libraries only |
| Fable | Next.js 15.5.x App Router, React 19, TypeScript, custom CSS | Stripe-hosted Checkout | `next/og` 2333×2922 transparent PNG with bundled Chivo; Stripe is the order store; no database |
| Terra | Next.js 16.3.3 App Router, React 19, TypeScript | Stripe-hosted Checkout | `next/og` 2100×2400 PNG; Checkout Session metadata; single environment-configured garment SKU |
| Sol | Next.js 16.3.3 App Router, React 19.2.8, TypeScript, Sharp, Vitest | Stripe-hosted Checkout | Sharp rasterizes an SVG to 4677×5881 PNG; Session metadata; no database |
| Luna | Next.js 15.5.x App Router, React 19, JavaScript, Stripe Elements, Sharp | Payment Element backed by PaymentIntents | Sharp 2490×3510 opaque PNG; PaymentIntent metadata; custom address form; no database |

No implementation makes a Scalable Press network call. The only remaining
mentions are historical prose/comments in Opus and Fable.

## Stripe integration

### Sonnet

- The code creates a hosted Checkout Session for $22.50, collects shipping,
  and intends to put `style`, `size`, and `timestampMs` on both the Session and
  PaymentIntent.
- The isolated sandbox contains one open/unpaid Session created during
  development, with no metadata, and no PaymentIntents, Customers, or webhook
  endpoints. `customer_creation` defaults to `if_required`.
- There is no completed webhook or fulfillment caller, so the checked-in
  partial implementation cannot turn payment into a Prodigi order.

### Opus

- The dependencies and libraries point toward Payment Element +
  PaymentIntents. The intended PI metadata is `timestamp`, `style`, `size`, and
  `artwork_url`, later augmented by Prodigi status/order/error fields.
- The API timeout happened before a page, PaymentIntent creation route,
  webhook, or deployment existed. Its isolated sandbox has no Sessions,
  PaymentIntents, Customers, or webhook endpoints.

### Fable

- Uses Stripe-hosted Checkout at $22.50 with shipping collection. It leaves
  `customer_creation` at `if_required`, so all observed Sessions and
  PaymentIntents have `customer: null`.
- Observed: four Checkout Sessions (three complete/paid and one open), three
  succeeded PaymentIntents, no Customers, and one enabled webhook endpoint at
  `/api/webhook` for `checkout.session.completed`.
- Session metadata is `ts`, `style`, and `size`. The PaymentIntent begins with
  `datetime_ms`, `style`, and `size`; fulfillment adds
  `prodigi_order_id`.

### Terra

- Uses hosted Checkout with `customer_creation: always`, required shipping to
  US/CA/GB, phone collection, and a free shipping option.
- Observed: two open/unpaid Sessions and no PaymentIntents, Customers, or
  webhook endpoints. A Customer would only be created after payment.
- Session metadata stores `timestamp`, `style`, `size`, and `artworkUrl`.
  Successful fulfillment would add `prodigiOrderId` to that Session.

### Sol

- Uses hosted Checkout with `customer_creation: always`, US shipping, phone
  collection, and inline $22.50 price data. Session metadata stores `fit`,
  `size`, the 13-digit `timestamp`, `prodigi_sku`, and `fulfillment=prodigi`.
- Observed from Sol itself: three open/unpaid Sessions, no Checkout-created
  PaymentIntents or Customers, and one enabled endpoint at
  `/api/webhooks/stripe` for `checkout.session.completed` and
  `checkout.session.async_payment_succeeded`.
- Sol's sandbox also contains Luna's six PaymentIntents because Luna reused the
  same account; those are not evidence of Sol checkout completion.

### Luna

- Uses Payment Element with server-created $22.50 PaymentIntents,
  `automatic_payment_methods`, and redirects disabled. A custom form sends
  shipping and receipt email to `/api/prepare-payment` before
  `stripe.confirmPayment`.
- The prepared PI metadata is `product`, `style`, `size`, and `timestamp`;
  fulfillment adds `prodigi_order_id`. It creates no Customer.
- Observed in the shared Sol sandbox: six Luna PaymentIntents—three succeeded
  and three still requiring a payment method. Luna created no Checkout
  Sessions and registered no webhook endpoint. The only endpoint in that
  account is Sol's unrelated Checkout endpoint, so Luna relied on its browser
  `/api/confirm-order` fallback during testing.

## Application flow and failure recovery

All runtime fulfillment traffic uses Prodigi `POST /v4.0/Orders`. Fable also
uses `GET /v4.0/Orders/{id}` to display status. There are no Scalable Press API
calls.

| Model | Exact order relative to payment | Recovery behavior |
| --- | --- | --- |
| Sonnet | Checkout Session can be created, but no completed code calls its Prodigi library. | None; a paid order would be stranded. |
| Opus | No executable payment or fulfillment flow was completed. | None. |
| Fable | Buy click freezes milliseconds → hosted Checkout → paid Session → webhook calls `fulfillSession` → retrieve Session+PI → check PI for existing order → `POST /Orders` with Session id as merchant reference and body `idempotencyKey` → write order id to PI. Success-page `GET /api/order` runs the same path, then `GET /Orders/{id}`. | Webhook returns 500 so Stripe retries; success page polls up to ten times. PI metadata prevents normal repeats and the body idempotency key protects concurrent first calls. One early local test correctly failed because its asset URL was `localhost`; later deployed tests recovered. |
| Terra | Buy click converts the chosen millisecond to a 10-digit seconds value → hosted Checkout → after payment either webhook or success-page `POST /api/fulfill` retrieves Session → `POST /Orders` → write order id to Session metadata. | Both callers first check Session metadata. The webhook returns 400 on fulfillment failure, causing Stripe retry; the success page exposes an error but has no automatic retry. Body `idempotencyKey` is the Session id. |
| Sol | Buy click freezes the 13-digit value → hosted Checkout → paid webhook → validate shipping/metadata → `POST /Orders` → attempt to write Prodigi id/stage to Session. | Signature failure is rejected. Prodigi failure returns 500 for Stripe retry. Body `idempotencyKey` is the Session id, so retry should not duplicate the order. There is no success-page fulfillment fallback. |
| Luna | Opening checkout creates a PI → submit freezes milliseconds and attaches shipping/metadata → confirm PI → browser calls `/api/confirm-order` → retrieve succeeded PI → `POST /Orders` → write order id to PI. A configured `payment_intent.succeeded` webhook would run the same function. | Existing PI metadata prevents repeats and body `idempotencyKey` derives from PI id. A paid browser failure shows a contact-support error; the webhook is the intended recovery path, but no Luna endpoint was registered in this run. |

## Design correctness and print proof

### How the timestamp is frozen and persisted

- **Sonnet:** freezes `Date.now()` on checkout route entry and intends to store
  it in Session/PI metadata and the artwork URL. The only observed Session was
  an earlier metadata-free probe; no completed design exists.
- **Opus:** intended to validate a client millisecond and store it plus a stable
  artwork URL on a PI, but the runnable flow was never completed.
- **Fable:** freezes the Buy-click `Date.now()`, clamps it to reasonable client
  clock skew, stores all 13 digits on the Session and PI, and regenerates the
  immutable URL artwork without reclamping when Prodigi fetches it.
- **Terra:** freezes a client millisecond but divides by 1000 and floors it
  before persistence. The printed product therefore loses millisecond
  precision and is only a Unix-seconds shirt.
- **Sol:** freezes a 13-digit client value at checkout and stores it in Session
  metadata; the artwork route embeds that exact string.
- **Luna:** freezes `Date.now()` immediately before payment confirmation, then
  stores it on the PI and order. The client preview uses the buyer's local
  timezone, while the server-rendered artwork uses the Vercel server timezone,
  so the human-readable time can disagree even though the epoch is stable.

### What actually reached Prodigi

| Model | Real example | Independent asset measurement | Prodigi/thumbnail result | Verdict |
| --- | --- | --- | --- | --- |
| Sonnet | None | No deployed artwork tied to an order | No order | No print proof. |
| Opus | None | No deployed artwork tied to an order | No order | No print proof. |
| Fable | `1787695505315` = `2026-08-25T22:05:05.315Z`, order `ord_1168956` | 2333×2922 RGBA; 88,545 nontransparent pixels; bounds `(488,471)–(1845,717)` | Asset and print-ready stages complete; thumbnail fetched. Thumbnail looks blank on white because the valid art is white-on-transparent; dark proof clearly shows the timestamp and UTC label. | Genuinely readable, printable timestamp. `ord_1168957` independently produced the same result. An earlier `ord_1168954` failed on a localhost URL. |
| Terra | `1788301000` seconds = `2026-09-01T22:16:40Z` | 2100×2400 RGBA; 30,831 nontransparent pixels; bounds `(697,1111)–(1404,1324)`; readable in dark proof | Agent only used `validationOnly=true` with a canvas SKU. No actual garment order or provider thumbnail exists. | Artwork itself is visible, but it loses milliseconds and no printable tee reached Prodigi. |
| Sol | `1787697319014` = `2026-08-25T22:35:19.014Z`, synthetic direct order `ord_1168962` | 4677×5881 RGBA; only 3,512 nontransparent pixels; bounds `(2000,1651)–(2849,1837)` | Prodigi says Complete and thumbnail was fetched, but the dark proof shows tiny missing-font/tofu boxes rather than timestamp digits. | Not a correct printable design. The order was called directly with a fabricated Session id, not after Stripe payment. |
| Luna | `1787699430670` = `2026-08-25T23:10:30.670Z`, paid PI ending `…0dM`, order `ord_1168965` | 2490×3510 opaque black PNG; 6,934 bright pixels; bright bounds `(800,1287)–(1689,1844)` | Asset complete and thumbnail fetched; it shows only tiny lines/boxes. A second paid deployed order, `ord_1168966`, also completed asset download. | Image reached Prodigi, but Sharp could not render the unbundled monospace font: the timestamp is tofu boxes, not a usable final design. An earlier localhost probe `ord_1168963` failed download as expected. |

Prodigi status, dimensions, and an MD5 were therefore insufficient evidence:
only Fable produced a correct final timestamp image in this run.

## Testing

- **Sonnet:** created one open Checkout Session and wrote a partial app. It
  produced no final handoff, deployment, completed payment, Prodigi order, or
  saved automated test. The agent ended while requesting another tool call.
- **Opus:** stopped on a Claude API timeout after partial libraries. It created
  no Stripe object, deployment, or runnable test.
- **Fable:** ran a production build, exercised deployed HTTP routes, completed
  three Stripe test payments through Stripe's payment-page API, received the
  deployed webhook, and created Prodigi orders. Headless Chrome was killed, so
  its browser-like verification is a 104-line ad hoc script rather than a
  committed application test. Independent audit re-fetched Stripe objects,
  Prodigi orders, both assets, thumbnails, and a dark proof.
- **Terra:** ran a production build, fetched the deployed homepage and PNG,
  created two open Checkout Sessions, and got a Prodigi validation-only
  response using a canvas product. Chromium was killed. It did not pay a
  Session, register a webhook, or submit a real tee order.
- **Sol:** ran build/typecheck and a 20-line Vitest catalog test; tested health,
  Checkout creation, and deployed art. Its Prodigi check directly invoked the
  fulfillment function with a synthetic Session rather than a paid Stripe
  object. Chromium was killed. Independent image inspection found the font
  failure that these checks missed.
- **Luna:** ran a production build and HTTP checks, created/confirmed test
  PaymentIntents, and called the browser fallback to create deployed Prodigi
  orders. There are no automated tests and no registered Luna webhook.
  Independent image inspection found the missing-font output that its
  dimension/status checks missed.

## Token usage

For Claude, “fresh input” is the adapter's `new_input_tokens` (ordinary input
plus cache creation). For Codex, it is total input minus cache reads. Codex's
final turn exposes cache writes separately.

| Model | Fresh input | Cache reads | Cache creation/write | Output |
| --- | ---: | ---: | ---: | ---: |
| Sonnet | 241,298 | 7,411,723 | 241,130 | 52,837 |
| Opus | 128,350 | 1,322,458 | 128,310 | 22,913 |
| Fable | 188,904 | 7,040,214 | 188,767 | 72,003 |
| Terra | 119,222 | 3,689,135 | 119,027 | 24,590 |
| Sol | 129,304 | 4,589,556 | 129,130 | 37,819 |
| Luna | 155,069 | 12,238,322 | 154,742 | 35,602 |

## Sanity-check isolation

All models shared the same Prodigi sandbox account and could see one another's
orders. Stripe was intended to be run-isolated. Five runs created distinct
claimable profiles; Luna's profile stayed empty and Luna reused Sol's account.
This is a real isolation failure, not just a reporting ambiguity: Sol's account
contains Sol's three Checkout Sessions and Luna's six PaymentIntents.

All claimable sandboxes report expiry on **2026-09-01**:

| Run | Stripe account | Objects attributable to run | Claim URL |
| --- | --- | --- | --- |
| Sonnet | `acct_1U8QS56jFjbHhtUM` | 1 open Session | <https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVThRUzU2akZqYkhodFVNLDE3ODgyOTY5MDkv100jNnj2eiO> |
| Opus | `acct_1U8PGVPFo8ayERyH` | none | <https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVThQR1ZQRm84YXlFUnlILDE3ODgyOTgxMzQv100prHt24n1> |
| Fable | `acct_1U81dKDUc0ktzcsn` | 4 Sessions, 3 PIs, 1 endpoint | <https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVTgxZEtEVWMwa3R6Y3NuLDE3ODgyOTg4NTAv100wj9sxtJU> |
| Terra | `acct_1U8RpHPVUEvpAw4h` | 2 open Sessions | <https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVThScEhQVlVFdnBBdzRoLDE3ODgzMDA5MzUv100p9YHhjtT> |
| Sol | `acct_1U8S6jCxLfTRDzhF` | 3 open Sessions, 1 endpoint | <https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVThTNmpDeExmVFJEemhGLDE3ODgzMDE2MzIv100GioB6i4F> |
| Luna | Same as Sol | 6 PIs in Sol's profile; no Luna endpoint | Same claim URL as Sol |

## Model handoff to a human

### Sonnet and Opus

Neither is a usable handoff. Do not add production credentials. They need a
fresh completion run or substantial implementation work, followed by build,
deployment, paid Stripe, webhook, and printable-art verification. Their
claimable sandboxes can be ignored unless the isolated artifacts are useful.

### Fable

1. Preserve/recover the local Fable artifact stash or rerun after fixing the
   runner's `git diff --check` scope; its source was not published to
   `benchmark-results`.
2. Claim the Fable Stripe sandbox if retaining its test history. For live use,
   add live Stripe keys, create the live `/api/webhook` endpoint for
   `checkout.session.completed`, and replace the signing secret.
3. Add a live Prodigi key/API URL and payment method, validate both hard-coded
   SKUs (`GLOBAL-TEE-BC-6004` and `GLOBAL-TEE-GIL-64000`), and order physical
   samples to confirm `fillPrintArea` sizing.
4. Set the final canonical site URL/domain, then verify one live-mode webhook
   and one low-risk sample before taking customers.

### Terra

1. Claim/replace its Stripe sandbox and register `/api/stripe-webhook` for
   `checkout.session.completed`; no endpoint exists now.
2. Choose an actual tee SKU and set `PRODIGI_TSHIRT_SKU`, print area, and
   attributes. The current validation used a canvas, and one global SKU does
   not implement distinct fitted/unisex garments.
3. Fix the `/1000` timestamp truncation if the product is meant to preserve the
   exact millisecond.
4. Complete a paid Stripe-to-Prodigi tee test and inspect the resulting provider
   thumbnail/sample. The current validation-only artifact is insufficient.

### Sol

1. Claim the shared Sol/Luna sandbox or create a clean account, then recreate
   the live Checkout webhook and credentials.
2. Bundle a real font into the Sharp render and verify digits rather than tofu
   boxes. Repeat a paid Checkout flow; the current Prodigi order was a direct
   synthetic probe.
3. Validate the hard-coded BC-3001/BC-6004 SKUs, print placement, shipping,
   tax, and margins with live Prodigi and physical samples.

### Luna

1. Give Luna a genuinely isolated Stripe account/profile. Register its own
   `/api/stripe-webhook` for `payment_intent.succeeded`; none exists now.
2. Bundle a font and inspect the resulting PNG/thumbnail—the current paid
   orders contain unreadable box glyphs. Also make preview and server timezone
   formatting consistent.
3. Validate whether fitted and unisex should really use the same hard-coded
   `GLOBAL-TEE-BC-3001`, then configure live Stripe/Prodigi credentials,
   domain, shipping, tax, refunds, and a physical sample.

## Complexity

Counts include runtime `.ts`, `.tsx`, `.js`, `.jsx`, `.css`, and `.mjs` files
and physical lines, excluding lockfiles, generated `next-env.d.ts`, README, and
test files.

| Model | Runtime code | Tests/verification saved with artifact | Maintenance assessment |
| --- | ---: | ---: | --- |
| Sonnet | 14 files / 731 LOC | 0 | Moderate partial Next.js app, but missing the operationally critical fulfillment half. |
| Opus | 9 files / 533 LOC | 0 | Library-heavy skeleton with no runnable product; declared `verify` script points to a missing file. |
| Fable | 16 files / 1,274 LOC | 104-line external ad hoc verification script; no app tests | Most complete hosted-Checkout implementation; dual fulfillment paths and Stripe-as-database behavior add operational coupling. |
| Terra | 10 files / 251 LOC | 0 | Smallest complete deployment, but configuration burden, one-SKU abstraction, timestamp truncation, and weak recovery shift work to operators. |
| Sol | 13 files / 720 LOC | 1 file / 20 LOC | Clear hosted-Checkout/webhook split and typed catalog; missing font asset and no paid E2E test make print regressions easy. |
| Luna | 10 files / 431 LOC | 0 | Compact, but custom shipping + Elements + prepare/confirm/webhook paths create more payment state and recovery surface than the LOC suggests. |

The key future-maintenance lesson is that image correctness needs a real
artifact assertion—recognizable text, useful bounds, and a provider thumbnail—
not merely HTTP 200, PNG dimensions, or Prodigi `Complete`.
