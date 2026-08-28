# Six-model Prodigi benchmark — 2026-08-27

The runs were executed strictly one at a time in the requested order: Claude
Sonnet, Claude Opus, Codex Terra, Codex Sol, Codex Luna, and Claude Fable. All
used base commit `3ca2c2c`, prompt SHA-256 `4d3eb6c3…`, `high` reasoning, a
one-hour model timeout, a distinct Vercel project, and a run-isolated Stripe CLI
profile. The six artifacts are published as consecutive commits on
`benchmark-results`.

Five artifacts completed the runner's normal publication path. Fable's agent
exited successfully, but the runner's whitespace gate rejected three trailing
spaces in the agent's copied reference repository. Its staged artifact passed
the runner-equivalent secret scan and was published unchanged through the
preserved recovery branches as commit `e1123ad`. The local raw transcript was
then removed, and the worktree returned cleanly to `main`.

All six metadata statuses are `succeeded`, but that means the agent exited zero;
it does not prove a paid, printable customer flow. Independent inspection found:

- Sonnet, Opus, and Fable completed real paid Stripe Checkout sessions and sent
  visible artwork to Prodigi.
- Terra never configured a usable Stripe sandbox. Its direct Prodigi order was
  accepted, but the exact 4677×5881 PNG fetched by Prodigi is fully transparent.
- Sol created three unpaid Checkout Sessions and no PaymentIntent or charge. Its
  signed-webhook simulation created a Prodigi order tied to an unpaid Session;
  the artwork itself is visible and correct.
- Luna created two unpaid Checkout Sessions and no PaymentIntent or charge. Its
  simulated orders used synthetic Session references; its print is extremely
  small, formats the epoch as date/time rather than printing the raw epoch, and
  both UI fits fulfill as the same unisex SKU.
- Fable proved two paid flows and two visible prints, but registered the same
  Stripe webhook twice and committed an unnecessary full clone of the legacy
  reference repository.

Treat these as directional case studies, not a formal model ranking.

## Overview

| Model | Reasoning | Recorded status | Elapsed | Deployment | HTTP | Exact page title |
| --- | --- | --- | ---: | --- | ---: | --- |
| Claude Sonnet | High | Succeeded | 28m 31s | <https://benchmark-20260827-harness6-high-cl.vercel.app> | 200 | `datetime.store — a t-shirt with the current datetime` |
| Claude Opus | High | Succeeded | 59m 01s | <https://benchmark-20260827-harness6-high-cl-chi.vercel.app> | 200 | `datetime.store — we sell a t-shirt with the current datetime` |
| Codex Terra (`gpt-5.6-terra`) | High | Succeeded; no Stripe E2E, blank print | 8m 20s | <https://benchmark-20260827-harness6-high-co.vercel.app> | 200 | `datetime.store — a t-shirt from this exact moment` |
| Codex Sol (`gpt-5.6-sol`) | High | Succeeded; no paid E2E | 22m 10s | <https://benchmark-20260827-harness6-high-co-one.vercel.app> | 200 | `datetime.store — Wear this exact moment` |
| Codex Luna (`gpt-5.6-luna`) | High | Succeeded; no paid E2E, poor print | 11m 44s | <https://benchmark-20260827-harness6-high-co-eight.vercel.app> | 200 | `datetime.store — a shirt for right now` |
| Claude Fable | High | Succeeded; manual publication recovery | 19m 00s | <https://benchmark-20260827-harness6-high-cl-iota.vercel.app> | 200 | `the datetime store` |

All six exact aliases returned public HTML without authentication. Raw
`metadata.json` URLs contain trailing Markdown fragments for every run because
the runner's URL extractor captured adjacent completion-report text; the table
uses independently verified canonical aliases.

## Framework and major technology choices

| Model | Framework and UI | Payment surface | Artwork and order state |
| --- | --- | --- | --- |
| Sonnet | Next.js 16.3.3 App Router, React 19.2.8, TypeScript, Tailwind 4 | Stripe-hosted Checkout | `next/og` 1600×2000 PNG; Session and PaymentIntent shirt metadata; Prodigi result on PaymentIntent; no database |
| Opus | Next.js 15.5.24 App Router, React 19.1, TypeScript, custom CSS | Stripe Embedded Checkout | `next/og`/bundled rendering at 3925×748; Session is the receipt and PaymentIntent stores fulfillment state; no database |
| Terra | Next.js 15.3.1 App Router, React 19.1, JavaScript, `@resvg/resvg-js` | Stripe-hosted Checkout, not configured in deployment | Intended 4677×5881 PNG; Session metadata only; no persisted fulfillment result |
| Sol | Next.js 16.3.3 App Router, React 19.2.6, TypeScript, Zod | Stripe-hosted Checkout | `next/og` 3600×4500 PNG; Session metadata and eventual Prodigi id on Session; no database |
| Luna | Next.js 16.3.3 App Router, React 19.2, JavaScript, Sharp | Stripe-hosted Checkout | Sharp 2400×3000 PNG; no persisted Prodigi id or customer-visible status; one SKU for both fits |
| Fable | Next.js 15.4.6 App Router, React 19.1.1, TypeScript | Stripe-hosted Checkout | `next/og` 2400×800 PNG with bundled Chivo; Prodigi result on PaymentIntent; no database |

No deployed rebuild makes a Scalable Press network call. Fable's artifact does
contain a dormant full clone of the old repository—including its legacy code—
under `workspace/ref-datetime-store`; that directory is not part of the rebuilt
app or deployment and should not have been committed.

## Stripe integration

| Model | Observed Stripe objects | Customer creation | Metadata and fulfillment record |
| --- | --- | --- | --- |
| Sonnet | 24 Checkout Sessions: 3 paid and 21 unpaid; 3 succeeded PaymentIntents/charges; 0 Customers | Omitted | Session and PI store `timestampMs`, style, size, product, and artwork URL. PI later stores `prodigiOrderId`, status, or error. |
| Opus | 18 Sessions: 7 paid and 11 unpaid; 8 PaymentIntents (7 succeeded, 1 canceled); 7 charges; 0 Customers | Omitted | Session/PI store `ts`, style, and size. PI later stores `prodigi_order_id` or bounded error text. |
| Terra | No usable Stripe API key or account in its saved profile; no independently observable objects | `always` in code | Intended Session metadata: stamp, size, fit, and SKU. No result is written back to Stripe. |
| Sol | 3 unpaid Sessions; 0 PaymentIntents, charges, or Customers | `always` in code | Session stores fit, size, timestamp, origin, and later `prodigi_order_id`; future PI metadata repeats the design. The observed order id was attached by a simulated signed event, not a paid Checkout. |
| Luna | 2 unpaid Sessions; 0 PaymentIntents, charges, or Customers | `always` in code | Session/future PI store product, style, size, and timestamp. Prodigi result is logged only. |
| Fable | 9 Sessions: 2 paid and 7 unpaid; 2 succeeded PaymentIntents/charges; 0 Customers | Omitted | Session/PI store `ts`, style, and size. PI later stores `prodigi_order_id` and outcome. |

All observed paid charges were $22.50. Terra alone changed the product price to
$29.00 in both its UI and Checkout code.

### Registered webhooks

| Model | Registered endpoint and events |
| --- | --- |
| Sonnet | One enabled `/api/webhooks/stripe`; `checkout.session.completed` |
| Opus | One enabled `/api/stripe/webhook`; `checkout.session.completed` and `checkout.session.async_payment_succeeded` |
| Terra | None; no usable Stripe sandbox was provisioned |
| Sol | One enabled `/api/stripe/webhook`; both Checkout completion events |
| Luna | One enabled `/api/webhook`; `checkout.session.completed` |
| Fable | **Two duplicate enabled** `/api/stripe-webhook` endpoints; both subscribe to `checkout.session.completed` |

Every deployed webhook returned HTTP 400 to an independently issued unsigned
POST. Luna nevertheless contains a dangerous configuration fallback: if
`STRIPE_WEBHOOK_SECRET` is missing, it parses and accepts unsigned JSON. The
current deployment rejects unsigned events only because the secret is present.

## Application flow and recovery behavior

All intended flows call Prodigi only after a Checkout completion event reports
payment as paid. No rebuilt application has a pre-payment Prodigi call in its
customer path. The strength of the proof and the recovery behavior differ.

| Model | Exact runtime call order | Failure and recovery behavior |
| --- | --- | --- |
| Sonnet | Freeze `Date.now()` → create hosted Checkout → paid webhook uses event Session → `POST /v4.0/Orders` → annotate PaymentIntent → success page polls Stripe metadata | PI metadata plus Prodigi body `idempotencyKey=session.id` prevent ordinary duplicates. Fulfillment exceptions are caught and recorded, but the webhook still returns 200, so Stripe will not retry; the success page only polls and tells the customer support will handle it. |
| Opus | Freeze epoch → create embedded Checkout → payment → webhook or receipt endpoint re-fetches expanded Session → `POST /v4.0/Orders` → annotate PI; status can `GET /v4.0/Orders/{id}`; health can `POST /v4.0/Quotes` | Strongest recovery path here: payment is re-verified, the receipt can safely retry, Prodigi body/header idempotency covers races, errors persist on the PI, and webhook failures return 500 for Stripe retry. Prodigi status callbacks are unsigned and informational only. |
| Terra | Capture current ticker value → create hosted Checkout → signed paid webhook → `POST /v4.0/orders`; direct probe separately called Prodigi | Body `idempotencyKey=session.id` and webhook 500 cover transient retries. No order id/error is persisted and the success page does not verify payment or fulfillment. The deployed Stripe path was never configured or exercised. |
| Sol | Freeze epoch → create hosted Checkout → signed completion webhook trusts its event Session → `POST /v4.0/orders` → write order id to Session; success page separately re-fetches and can retry | Prodigi body idempotency protects duplicates. Exceptions escape the webhook as non-2xx, and the success page re-checks `payment_status` before retrying. The recorded order was created from a signed synthetic event whose corresponding live Stripe Session remained unpaid, so it does not prove the actual paid path. Callback route only acknowledges. |
| Luna | Capture epoch → create hosted Checkout → completion webhook uses event Session → `POST /v4.0/Orders`; result is only logged | Body idempotency prevents duplicate order creation and failures return 502. No order state is stored or displayed. The code uses legacy `session.shipping_details`, so a modern event using only `collected_information.shipping_details` can fail. The success page blindly claims payment and fulfillment without retrieving the Session. |
| Fable | Freeze epoch → create hosted Checkout → paid webhook re-fetches expanded Session → `POST /v4.0/Orders` → annotate PI → success page refreshes until PI metadata appears | PI metadata plus Prodigi body idempotency safely handle the two duplicate webhook deliveries; failures return 500 for retry. Missing address is acknowledged with 200 as a permanent/manual exception. Success-page refresh stops after about 30 seconds but a manual reload recovers display state. |

## Design correctness and print proof

The audit fetched a representative source asset from the exact URL saved by
Prodigi, fetched Prodigi's generated thumbnail, decoded the RGBA pixels,
measured alpha content and bounds, composited white-on-transparent artwork over
a dark background, and visually inspected the proofs. This is stricter than
accepting HTTP 200, dimensions, or `assetStatus=Complete`.

| Model | Real final-design example | Source pixels, nontransparent count, and bounds | Prodigi evidence | Print verdict |
| --- | --- | --- | --- | --- |
| Sonnet | raw epoch `1787886393155`, fitted/M, order `ord_1169317` | 1600×2000 RGBA; 23,271 pixels; `(455,307)–(1136,693)` | Order and asset Complete; source and thumbnail fetched | Clearly visible raw epoch plus small supporting text. Genuine art reached Prodigi, but 1600×2000 is below the agent's own recommended production resolution. |
| Opus | raw epoch `1787889886888`, unisex/XL, order `ord_1169325` | 3925×748 RGBA; 330,045 pixels; `(565,254)–(3360,495)` | Complete; five final deployed orders `ord_1169321–25` cover both fits | Strong, legible full-width raw epoch and the best print geometry in this run. |
| Terra | raw epoch intended as `1777286400123`, order `ord_1169326` | 4677×5881 RGBA; **0 pixels; no alpha bounds** | Prodigi marked the order and asset Complete and generated a white thumbnail | Fully transparent and not printable. This directly disproves the agent's acceptance claim. |
| Sol | raw epoch `1787897712345`, order `ord_1169330` | 3600×4500 RGBA; 109,517 pixels; `(956,2156)–(2621,2343)` | Order and asset Complete; source and thumbnail fetched | Clearly visible raw epoch. Print file is credible, but the linked Stripe Session is unpaid and the order came from a signed simulation. |
| Luna | epoch input `1787865600123`, order `ord_1169332` | 2400×3000 RGBA; only 1,864 pixels; `(1075,1407)–(1331,1724)` | Order and asset Complete; source and thumbnail fetched | Far too small in the print area and not the original raw epoch design: it renders a formatted UTC date/time label. Both UI fits also submit `GLOBAL-TEE-BC-3001`. |
| Fable | raw epoch `1787893813913`, fitted/S, order `ord_1169334` | 2400×800 RGBA; 122,378 pixels; `(228,316)–(2173,486)` | Asset Complete; `ord_1169333–34` prove both paid fits; order stage was InProgress at audit | Clearly visible, wide raw epoch using bundled Chivo. Genuine printable artwork reached Prodigi. |

Prodigi's 100-pixel JPEG thumbnails flatten white-on-transparent art onto white,
so even good assets look blank there. Dark-background proofing distinguished
the genuinely blank Terra file and Luna's tiny design from the four readable
assets.

### When the design is frozen and where it persists

- **Sonnet:** `Date.now()` is set in state before any network request, copied to
  Session and PaymentIntent metadata, and embedded in the artwork URL. The
  server enforces ±5 minutes of clock freshness.
- **Opus:** `Date.now()` is frozen before Checkout creation; the same epoch
  drives embedded Checkout metadata, receipt, and deterministic artwork. The
  receipt/webhook path re-fetches Stripe before fulfillment.
- **Terra:** the latest 37 ms ticker string is captured in the click closure and
  sent to Session metadata, but the visible ticker never actually stops. The
  server validates only that it is 13 digits.
- **Sol:** `Date.now()` is frozen into a ref and visible state before the request,
  then persisted on Session/future PI metadata and the artwork path. Validation
  checks a broad epoch range, not proximity to server time.
- **Luna:** the click captures `Date.now()` for metadata, but the visible ticker
  keeps running. The artwork deterministically reformats the epoch into date,
  time, milliseconds, and labels instead of printing the raw value.
- **Fable:** `Date.now()` is frozen before the request, copied to Session and PI
  metadata, and used in the artwork and Prodigi metadata. The server enforces
  ±5 minutes of clock skew.

## Testing

| Model | Agent validation | Independent confirmation and remaining gaps |
| --- | --- | --- |
| Sonnet | Reported a full Playwright-hosted Checkout, real paid card, webhook delivery, idempotency replay, and Prodigi order | Fresh `npm ci`/production build passed; live page is 200; Stripe confirms 3 paid charges; Prodigi and pixels confirm the final print. No committed tests. Failure metadata is acknowledged instead of retried. |
| Opus | Committed a 112-line smoke-purchase script and reported repeated desktop/mobile paid flows, bad signatures, duplicate fulfillment, asset bounds, and quotes | Fresh build passed; Stripe confirms 7 paid charges; Prodigi confirms five good final deployed orders plus three failed localhost experiments. Embedded Checkout was not re-run independently to avoid more test charges/orders. |
| Terra | Reported build/deploy, HTTP checks, Prodigi catalog validation, and a direct order | Fresh build passed and live page is 200, but no usable Stripe profile exists and pixel analysis proves the accepted print blank. No committed tests or paid browser flow. |
| Sol | Reported HTTP checks, Checkout Session creation, signed webhook testing, and a Prodigi sandbox order | Fresh build passed and artwork is visible. Stripe confirms all 3 Sessions are unpaid and no PI/charge exists. `npm test` fails because `tests/*.test.mjs` does not exist; there are no committed tests despite the package script. |
| Luna | Reported build/deploy, Session creation, signed webhook simulation, image retrieval, and Prodigi acceptance | Fresh build passed and live page is 200. Stripe confirms only 2 unpaid Sessions; both Prodigi references are synthetic. No committed tests; pixel proof exposes the tiny formatted design and fitted-SKU mismatch. |
| Fable | Committed two 94-line Playwright Checkout scripts and reported paid purchases for both fits, bad signatures, and visible artwork | Fresh build passed; Stripe confirms 2 paid charges; Prodigi/pixel evidence confirms both designs. The duplicate webhook and unnecessary reference clone remain. |

Independently, all six production builds passed, all six storefronts returned
HTTP 200 with the titles recorded above, and all six deployed webhook routes
rejected an unsigned POST with HTTP 400. No new paid browser purchases were
introduced during the audit; existing Stripe, Prodigi, source asset, thumbnail,
and dark-proof evidence was used instead.

## Token usage

`Fresh input` is the normalized non-cache input figure recorded by the runner.
For Claude it includes cache creation; Codex does not expose a separate cache
creation/write number.

| Model | Fresh input | Cache reads | Cache creation/write | Output |
| --- | ---: | ---: | ---: | ---: |
| Claude Sonnet | 226,536 | 23,793,058 | 226,186 | 96,233 |
| Claude Opus | 187,434 | 15,837,108 | 187,182 | 107,785 |
| Codex Terra | 114,159 | 2,700,544 | Not reported | 17,173 |
| Codex Sol | 311,338 | 19,941,248 | Not reported | 46,514 |
| Codex Luna | 151,930 | 4,248,320 | Not reported | 28,074 |
| Claude Fable | 106,887 | 5,595,947 | 106,743 | 53,339 |

## Sanity-check isolation

All saved Stripe files are permission-protected (`0600`) under
`.benchmark-secrets/stripe/`. Five runs created distinct claimable Stripe
sandbox accounts; Terra's isolated profile contains no test key, account, or
claim URL. All claimable sandboxes expire on 2026-09-04.

| Model | Stripe account and observed objects | Registered webhook | Claim URL |
| --- | --- | --- | --- |
| Sonnet | `acct_1U8y0lKC7FhvfozD`; 24 Sessions, 3 paid PIs/charges, 0 Customers | One enabled Checkout-completion endpoint | [Claim Sonnet sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVTh5MGxLQzdGaHZmb3pELDE3ODg0ODk2ODAv100keQOl36B) |
| Opus | `acct_1U9AkLB4oapHS5X4`; 18 Sessions, 7 paid and 1 canceled PI, 7 charges, 0 Customers | One enabled endpoint for completion and async success | [Claim Opus sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVTlBa0xCNG9hcEhTNVg0LDE3ODg0OTE5NDMv100zeNUB3L3) |
| Terra | No account; profile has no credentials | None | Not available |
| Sol | `acct_1U9648BZbBOgoxWZ`; 3 unpaid Sessions, 0 PIs/charges/Customers | One enabled endpoint for both completion events | [Claim Sol sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVTk2NDhCWmJCT2dveFdaLDE3ODg0OTU3NjIv100qsbJF80M) |
| Luna | `acct_1U9FcGD9vMnZDpMd`; 2 unpaid Sessions, 0 PIs/charges/Customers | One enabled Checkout-completion endpoint | [Claim Luna sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVTlGY0dEOXZNblpEcE1kLDE3ODg0OTY5MDkv100tppF5x60) |
| Fable | `acct_1U9GMi7GwLZ5mqs4`; 9 Sessions, 2 paid PIs/charges, 0 Customers | **Two duplicate** enabled Checkout-completion endpoints | [Claim Fable sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVTlHTWk3R3dMWjVtcXM0LDE3ODg0OTc3MTAv100chGPdADT) |

The runner also captured empty wrapper/global Stripe files for some Codex runs;
they contain no usable credentials and do not change the account attribution.

Prodigi was **not isolated**. All six runs used the same supplied sandbox key
and one shared order history. Attribution relies on exact asset host, merchant
reference, timestamp, SKU, and run timing. Relevant orders were:

- Sonnet: `ord_1169317` (plus earlier final-deployment checks)
- Opus: `ord_1169321` through `ord_1169325`; three earlier localhost assets
  failed or were canceled
- Terra: `ord_1169326`
- Sol: `ord_1169329` and `ord_1169330`
- Luna: `ord_1169331` and `ord_1169332`
- Fable: `ord_1169333` and `ord_1169334`

Sandbox acceptance proves that a SKU and request shape were accepted today; it
does not prove live-region availability, garment fit, margin, physical print
placement, or print quality.

## Model handoff to a human

### Shared launch work

Claim the five usable Stripe sandboxes before 2026-09-04 or replace them with a
permanent account. Terra needs a Stripe account and keys from scratch. For the
chosen implementation, replace test Stripe credentials, create the same
webhook subscriptions in **live mode**, replace the Prodigi sandbox key, switch
the implementation's Prodigi base/environment variable to live, and redeploy.
Then order physical samples for every advertised garment/fit, validate SKU and
size availability in target regions, decide whether $22.50 with free shipping
has enough margin, and add taxes, receipts/email, terms, privacy, returns,
support, monitoring, and a custom domain.

Use these exact deployment variables when promoting a candidate:

| Model | Required live configuration |
| --- | --- |
| Sonnet | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRODIGI_API_KEY`, `PRODIGI_API_BASE_URL=https://api.prodigi.com/v4.0`, and canonical `NEXT_PUBLIC_SITE_URL` |
| Opus | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRODIGI_API_KEY`, and canonical `NEXT_PUBLIC_SITE_URL`; a non-`test_` Prodigi key selects the live base automatically |
| Terra | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRODIGI_API_KEY`, `PRODIGI_API_BASE=https://api.prodigi.com/v4.0`, and canonical `APP_URL` |
| Sol | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRODIGI_API_KEY`, `PRODIGI_API_BASE_URL=https://api.prodigi.com/v4.0`, `NEXT_PUBLIC_SHOP_MODE=live`, and canonical `NEXT_PUBLIC_SITE_URL` |
| Luna | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRODIGI_API_KEY`, `PRODIGI_ENV=live`, and canonical `APP_URL` |
| Fable | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRODIGI_API_KEY`, `PRODIGI_API_BASE=https://api.prodigi.com`, and canonical `PUBLIC_BASE_URL` |

Price, free-shipping countries, garment SKUs, color, and size mappings are
hard-coded in every candidate and require code changes when the commercial
catalog changes. Validate those values against Prodigi live-region quotes
before swapping credentials; sandbox order acceptance is not enough.

### Sonnet

Use a production-resolution artwork canvas and verify physical sizing. Change
post-payment failures to an actual retry/queue or return non-2xx to Stripe,
rather than only recording an error and acknowledging the event. Recreate the
single `checkout.session.completed` webhook and sample both Gildan SKUs.

### Opus

Recreate both Checkout webhook events, preserve its payment re-fetch and
idempotent receipt fallback, and sample Gildan 64000/64000L. Add durable
queueing/alerts beyond PaymentIntent metadata, decide how to handle refunds and
Prodigi cancellation, and validate the thin stated margin. This is the most
complete recovery design in this run, but still lacks a committed regression
suite beyond the E2E smoke script.

### Terra

Do not launch this artifact. Provision Stripe, restore the original $22.50
price if fidelity matters, fix the deployed resvg/font path until a decoded PNG
has meaningful nontransparent pixels, and complete a real paid Checkout through
the registered webhook to Prodigi. Persist order/error state and make the
success page verify payment and fulfillment.

### Sol

Complete an actual paid browser Checkout; the current signed simulation is not
equivalent. Add the missing tests or remove the broken `npm test` claim, with a
decoded-PNG alpha/bounds regression. Keep its visible 3600×4500 artwork and
provider idempotency, but add durable fulfillment monitoring and validate the
20-country free-shipping economics before live use.

### Luna

Do not launch unchanged. Render the raw epoch at a physically meaningful size,
map fitted to a verified fitted SKU (or remove the fit option), make webhook
signature configuration mandatory with no unsigned fallback, support modern
`collected_information.shipping_details`, and make the success page retrieve
and verify payment/fulfillment. Then complete a real paid flow and add pixel,
webhook, and SKU-mapping tests.

### Fable

Remove one duplicate webhook, delete the committed `ref-datetime-store` clone,
and make missing-address/payment-data failures actionable rather than silently
acknowledged. Preserve its paid-flow evidence, PI metadata, Prodigi idempotency,
and bundled-font artwork; sample both BC-6004 and GIL-64000 before launch.

## Complexity

Runtime lines below count `.js`, `.jsx`, `.mjs`, `.ts`, `.tsx`, `.css`, and
`.html` in application source, excluding locks, generated output, scripts,
tests, E2E code, and Fable's legacy reference clone. Verification lines are
committed test or E2E scripts only. Tracked workspace size includes all
committed artifacts.

| Model | Runtime files | Runtime lines | Verification files/lines | Tracked workspace | Maintenance profile |
| --- | ---: | ---: | ---: | ---: | --- |
| Sonnet | 17 | 1,091 | 0 / 0 | 31 files / 312 KB | Moderate hosted-Checkout implementation; real paid proof, but weak automatic recovery and low print resolution |
| Opus | 22 | 2,168 | 1 / 112 | 32 files / 200 KB | Largest intentional runtime; strongest payment, status, and retry design, with an E2E smoke script |
| Terra | 10 | 203 | 0 / 0 | 15 files / 68 KB | Smallest implementation, but missing Stripe setup, fulfillment state, and printable output |
| Sol | 14 | 399 | 0 / 0 | 23 files / 2.12 MB | Compact, visible high-resolution print and dual trigger; large static social image and a broken empty test suite |
| Luna | 10 | 332 | 0 / 0 | 14 files / 61 KB | Compact surface hides webhook, address-shape, SKU, success-state, and print-scale defects |
| Fable | 15 | 1,164 | 2 / 188 | 70 files / 4.86 MB | Moderate actual app with useful E2E scripts; artifact is bloated by the unnecessary reference clone |

Operationally, none includes a database-backed order console, durable queue, or
complete merchant support workflow. Opus, Sonnet, and Fable have the strongest
real paid evidence; Sol has good art but only simulated payment evidence; Terra
and Luna require core product corrections before further launch work.
