# Seven-model beauty-prompt benchmark — 2026-09-05

This suite used `prompt-beauty.md`, suite ID `20260905-beauty-high`, base
commit `cbac7b4`, prompt SHA-256 `af594c56…`, and `high` reasoning for every
model. The seven models ran strictly one at a time in the requested order. Each
run used a distinct Vercel project and a run-specific Stripe CLI profile; all
artifacts are consecutive commits on `benchmark-results`.

All seven agents exited successfully. Six followed the normal runner
publication path. Astra's artifact was rejected only by the runner's whitespace
gate because bundled third-party font license files used CRLF line endings. The
unchanged staged artifact passed the runner-equivalent secret scan and was
published from the preserved recovery branches as commit `2c69af3`; the local
raw transcript and exact temporary branches were then removed.

Independent inspection found three materially different levels of end-to-end
proof:

- Astra and Fable completed a real paid Stripe flow and sent the exact visible
  design to Prodigi.
- Opus completed two real paid PaymentIntent flows and created visible Prodigi
  prints, but its production artwork URL defaults to only 320×396 pixels.
- Sol, Terra, Luna, and Sonnet did not complete a genuine paid customer flow.
  Some created direct or synthetic Prodigi orders, which are not equivalent.
- Terra produced a credible full-resolution transparent print file but never
  submitted that final design to Prodigi. Sonnet generated a full-resolution
  JPEG, while its synthetic Prodigi tests submitted the site's 64×64 icon
  instead. Luna submitted an opaque black rectangle whose timestamp is tiny.

These are directional case studies, not a formal ranking.

## Overview

| Model | Reasoning | Recorded status | Elapsed | Deployment | HTTP | Exact page title |
| --- | --- | --- | ---: | --- | ---: | --- |
| Codex `gpt-6-astra` | High | Succeeded; manual publication recovery | 41m 27s | <https://benchmark-20260905-beauty-high-codex-gpt-6-astra.vercel.app> | 200 | `datetime.store — Time flies. Wear it.` |
| Codex `gpt-5.6-sol` | High | Succeeded; no paid E2E | 27m 37s | <https://benchmark-20260905-beauty-high-code-ten.vercel.app> | 200 | `datetime.store — Wear this exact moment` |
| Codex `gpt-5.6-terra` | High | Succeeded; no paid E2E | 14m 51s | <https://benchmark-20260905-beauty-high-code-woad.vercel.app> | 200 | `datetime.store — wear a moment` |
| Codex `gpt-5.6-luna` | High | Succeeded in explicit demo mode; no usable Stripe account | 10m 45s | <https://benchmark-20260905-beauty-high-code-one.vercel.app> | 200 | `datetime.store — wear the moment` |
| Claude `claude-fable-5-1` | High | Succeeded | 29m 48s | <https://benchmark-20260905-beauty-high-clau.vercel.app> | 200 | `datetime.store — we sell a t-shirt with the current datetime` |
| Claude `claude-opus-5` | High | Succeeded; undersized production art | 40m 57s | <https://benchmark-20260905-beauty-high-clau-gold.vercel.app> | 200 | `datetime.store — we sell a t-shirt with the current datetime` |
| Claude `claude-sonnet-5` | High | Succeeded; no paid E2E, wrong synthetic print asset | 21m 05s | <https://benchmark-20260905-beauty-high-clau-two.vercel.app> | 200 | `datetime.store — wear this exact moment` |

The canonical aliases and titles above were independently fetched. Five raw
`metadata.json` deployment URLs contain trailing completion-report fragments
because the runner's URL extractor captured adjacent Markdown. Opus's extracted
value also included an order-page query string; this report intentionally does
not reproduce it.

## Framework and major technology choices

| Model | Framework and UI | Payment surface | Artwork and state |
| --- | --- | --- | --- |
| Astra | Next.js 16.3.4, React 19.2.8, TypeScript, custom CSS | Stripe-hosted Checkout | Sharp SVG→PNG at 4665×5844; signed deterministic art URL; Session metadata stores fulfillment outcome; no database |
| Sol | Next.js 16.3.4, React 19.2.6, TypeScript | Stripe-hosted Checkout | `next/og`-style server art at 2490×3510; Session metadata and status-route recovery; no database |
| Terra | Next.js 14.2.31/14.2.35, React 18.3.1, TypeScript | Stripe-hosted Checkout | `next/og` at 4680×5790; signed art URL; no persisted Prodigi result |
| Luna | Next.js 16.3.4, React 19.2.8, JavaScript | Hosted Checkout in code, explicit demo UI in deployment | Sharp 2400×1200 opaque PNG; result logged only |
| Fable | Next.js 15.5.25, React 19.1.1, TypeScript | Embedded CheckoutSessions | `next/og`/bundled type at 2340×2895; Session/PI metadata; status route can retry |
| Opus | Next.js 16.3.4, React 19.2.8, TypeScript | Elements with direct PaymentIntents, PaymentElement and AddressElement | `next/og` deterministic art route; PI metadata is the receipt and fulfillment record |
| Sonnet | Next.js 16.3.4, React 19.2.0, TypeScript | Stripe-hosted Checkout | Browser canvas exports public Vercel Blob JPEG at 4665×5844; Session/PI metadata; no durable retry |

No runtime contains a Scalable Press network call. A few comments and README
sentences name the replaced provider, but all implemented fulfillment calls are
to Prodigi.

## Stripe integration

| Model | Observed Stripe objects | Customer creation | Important metadata and result state |
| --- | --- | --- | --- |
| Astra | 4 Checkout Sessions; 3 PIs/charges: 1 succeeded and 2 deliberately declined; 0 Customers | Omitted | Session stores timestamp, fit, size, SKU, art URL/signature, amount, environment and eventual Prodigi id/status/error. PI repeats store/timestamp. |
| Sol | 2 unpaid Sessions; 0 PIs, charges, or Customers | `always` in code | Session stores timestamp, size, color, quantity, SKU and art URL; future PI repeats timestamp/size. |
| Terra | 2 unpaid Sessions; 0 PIs, charges, or Customers | `always` in code | Session stores the encoded frozen moment, size and color. No fulfillment result is persisted. |
| Luna | No usable isolated Stripe key/account; deployed demo does not charge | `always` in code | Intended Session/PI metadata stores style, size and ISO timestamp. |
| Fable | 17 Sessions; 1 paid PI/charge; 0 Customers | Omitted | Session/PI store timestamp, style, color, size and timezone; Session later stores Prodigi state. |
| Opus | 0 Sessions; 33 PaymentIntents, 2 succeeded charges; 0 Customers | Omitted | PI `ds_*` metadata stores design dialect, timestamp, fit, size, shipping tier and fulfillment result. |
| Sonnet | 3 unpaid Sessions; 0 PIs, charges, or Customers | Omitted | Session stores frozen timestamp, fit, color, size and Blob art URL. Future PI receives the same fields plus fulfillment notes. |

Astra's apparent “three charges” is not three paid purchases: one charge
succeeded for $32.00 and two $32.00 attempts using Stripe's decline card failed.
Fable charged $22.50 once. Opus charged $32.00 once and $47.00 once, the latter
including its hard-coded $15 express option. Sol and Terra list $36.00, Luna
$22.50, and Sonnet $32.00, but none completed payment.

### Registered webhooks

| Model | Registered endpoint and events | Independent unsigned POST |
| --- | --- | ---: |
| Astra | One enabled `/api/webhooks/stripe`; `checkout.session.completed`, `checkout.session.async_payment_succeeded` | 400 |
| Sol | One enabled `/api/stripe-webhook`; both Checkout completion events | **503 — deployed secret/config missing** |
| Terra | One enabled `/api/stripe-webhook`; `checkout.session.completed` | 400 |
| Luna | None; no usable account | **503 — deployed webhook not configured** |
| Fable | One enabled `/api/stripe/webhook`; both Checkout completion events | 400 |
| Opus | One enabled `/api/stripe/webhook`; `payment_intent.succeeded` | 400 |
| Sonnet | One enabled `/api/webhooks/stripe`; `checkout.session.completed` | 400 |

The 400 responses demonstrate signature enforcement. Sol and Luna's 503
responses also reject the request, but specifically because their deployed
webhook configuration is incomplete; they cannot currently process legitimate
events either.

## Application flow and recovery behavior

All runtime Prodigi order creation targets
`https://api.sandbox.prodigi.com/v4.0/Orders` (path casing varies). No candidate
intentionally orders before payment in its customer path, although only Astra,
Fable and Opus proved that path with a real payment.

| Model | Exact runtime call order | Failure and recovery behavior |
| --- | --- | --- |
| Astra | Freeze `Date.now()` → create hosted Checkout → paid webhook re-fetches Session → validate paid/complete/amount/currency/environment → `POST /orders` → write Prodigi id/status/error to Session; optional `GET /orders/{id}` status and product preflight | Session-derived SHA-256 idempotency key and metadata reduce duplicates. Fulfillment failures return 500 for Stripe retry. The customer status route reads state but does not itself invoke fulfillment; a committed recovery script handles manual repair. |
| Sol | Freeze `Date.now()` → create hosted Checkout → completion webhook/status route re-fetches Session → verify paid → `POST /Orders` → update Session with Prodigi id | Session id is the Prodigi idempotency key. Status polling can safely retry. Transient webhook errors return 400 rather than 5xx; Stripe still sees non-2xx, but the status classification is misleading. The observed order was a direct smoke order, not a paid Checkout. |
| Terra | Capture the current moment → hosted Checkout → completion webhook checks paid → `POST /orders` using event id → optional callback | Prodigi idempotency uses the Stripe event id and webhook failures are non-2xx. No order id/error is persisted and the success UI does not verify fulfillment. Code reads legacy `session.shipping_details`, risking failure with newer collected-information shapes. No final app design reached Prodigi. |
| Luna | Capture current ISO → intended hosted Checkout → completion webhook → `POST /Orders` | It does not verify `payment_status`, sends no Prodigi `idempotencyKey`, persists nothing, and only logs the result. Deployment is demo-only; its direct smoke order bypassed Stripe. |
| Fable | Freeze `Date.now()` → embedded Checkout → completion webhook re-fetches Session → verify paid → prelookup `GET /orders?merchantReferences=…` → `POST /orders` → persist result; status route can retry and `GET /orders/{id}` | Merchant-reference lookup plus Session idempotency protects ordinary retries/races. Errors return 500 and paid-session status polling supplies an independent recovery path. Prodigi callback is informational only. |
| Opus | Freeze `Date.now()` → create/confirm PaymentIntent with Elements → `payment_intent.succeeded` webhook → use PI shipping → `POST /Orders` → record outcome on PI; order page can retry after authenticating with the PI client secret | PI id is both body/header idempotency key. Errors return 500 and the authenticated order route can retry. Server timestamp validation accepts any year 1970–2100, so it does not enforce a fresh “current moment.” |
| Sonnet | Freeze timestamp → render/upload Blob JPEG → create hosted Checkout → completion webhook → `POST /Orders` → annotate future PI | Webhook does not explicitly check `payment_status`. It sends no true Prodigi idempotency key or prelookup, catches fulfillment errors and returns 200, and has no durable retry. Checkout accepts any client-supplied HTTPS art URL rather than restricting it to the owned Blob host. Its two Prodigi orders came from synthetic webhooks and used `/icon`, not the generated design. |

## Design correctness and print proof

The audit fetched every available source from the URL recorded by Prodigi,
fetched Prodigi's thumbnail, decoded source alpha, measured nontransparent pixel
counts and exclusive pixel bounds, composited transparent artwork over a dark
proof background, and visually inspected the proofs. For Terra, whose final
design never reached Prodigi, the exact deterministic app image was generated
from the recorded design example and inspected. For Sonnet, the latest art URL
stored on a real Stripe Session was inspected separately from its incorrect
synthetic Prodigi asset.

| Model | Real final-design example | Source pixels and nontransparent bounds | Prodigi evidence | Print verdict |
| --- | --- | --- | --- | --- |
| Astra | raw epoch `1788625340979`, unisex, order `ord_1170501` | 4665×5844 RGBA; 175,062 nontransparent; `(1154,840)–(3519,1064)` | Genuine paid Session; order and source Complete; thumbnail fetched | Visible, high-resolution raw epoch with real transparency; genuinely printable art reached Prodigi. |
| Sol | raw epoch from direct smoke order `ord_1170506` | 2490×3510 indexed transparency; 20,916 nontransparent; `(327,1257)–(2156,2139)` | Order/source Complete and thumbnail fetched; not linked to a paid Session | Visible and plausibly printable, but does not prove the paid app flow. |
| Terra | raw epoch `1788628942711` | 4680×5790 RGBA; 391,541 nontransparent; `(1044,2136)–(3633,3834)` | No final-design Prodigi order | Large visible transparent design, but no evidence Prodigi fetched it and no paid flow. |
| Luna | direct smoke order `ord_1170508` | 2400×1200 RGBA; all 2,880,000 pixels opaque; bounds are the full canvas | Order/source Complete and thumbnail fetched; bypassed Stripe | A black rectangle with very small formatted ISO text, not the requested raw epoch and unsuitable as transparent shirt artwork. |
| Fable | raw epoch `1788631287169`, fitted/L, white shirt, order `ord_1170515` | 2340×2895 RGBA; 71,810 nontransparent; `(538,490)–(1802,608)` | Genuine paid Session/PI; source and thumbnail fetched | Visible black raw epoch on transparency; genuine printable art reached Prodigi. |
| Opus | raw epoch `1789261234567`, midnight dialect, unisex/L, order `ord_1170523` | **320×396** RGBA; 3,930 nontransparent; `(44,53)–(276,133)` | Genuine paid PI; source and thumbnail fetched; second paid order `ord_1170525` covers fitted/white/express | Design is visible but far below print resolution. Missing `w` is converted to zero then clamped to 320 in the production URL path. |
| Sonnet | Session design `1788635149122`, fitted/M, black shirt, cotton-candy style | 4665×5844 JPEG; all pixels opaque, so transparency is impossible | No paid PI. Synthetic orders `ord_1170536–37` submitted the 64×64 app icon (3,928 nontransparent pixels), not this design | The actual JPEG design is visually rich and full-resolution but unsuitable for transparency validation; it never reached Prodigi in the tested flow. |

Timestamp freezing also differs:

- Astra freezes before Checkout, displays the frozen value, persists it in
  signed art and Stripe metadata, and enforces roughly -30 minutes/+30 seconds.
- Sol freezes before Checkout and persists it, with broad -1 day/+60 seconds
  freshness.
- Terra freezes the captured structured moment in Session metadata; the
  deterministic artwork can reproduce it.
- Luna sends a captured ISO value but leaves the visible ticker running and
  reformats the value in its artwork.
- Fable freezes before embedded Checkout, stores it in session storage plus
  Stripe metadata, and reconciles server-side freshness.
- Opus freezes before PaymentIntent creation and persists the epoch on the PI,
  but accepts arbitrary historical timestamps in a broad year range.
- Sonnet freezes before browser rendering/upload and stores the Blob URL and
  timestamp on the Checkout Session.

## Testing

| Model | Agent validation | Independent confirmation and remaining gaps |
| --- | --- | --- |
| Astra | Committed eight verification files including seven focused tests; reported paid and declined Checkout flows, webhook handling and Prodigi order | Fresh production build and all 7 tests passed; live 200; Stripe proves one paid/two declined attempts; pixel/thumbnail evidence proves the print. Physical sample and asynchronous failure recovery remain untested. |
| Sol | Reported build, Checkout creation, direct Prodigi smoke order and live checks | Fresh build passed; live 200; art is visible. Stripe confirms both Sessions unpaid, deployed webhook is unconfigured, and no committed tests exist. `npm audit` reports 1 low and 3 high vulnerabilities. |
| Terra | Reported build, Checkout Session creation and image checks | Fresh build passed; live 200; locally reproduced design is visible. Stripe confirms no payment; no final Prodigi order or committed tests. `npm audit` reports 2 high vulnerabilities. |
| Luna | Reported intentional demo deployment and direct Prodigi smoke | Fresh build passed and live page is 200. No usable Stripe profile, configured webhook, paid flow or committed tests; visual proof exposes the opaque/tiny design. |
| Fable | Reported embedded paid checkout, signature checks and final Prodigi order | Fresh build passed; Stripe/Prodigi/pixels independently confirm the paid print. No committed tests; failure branches and concurrent duplicate delivery were not independently exercised. |
| Opus | Reported Elements purchases for two variants, webhook, recovery and Prodigi | Fresh build passed; two paid charges and two orders confirmed. No committed tests. Pixel inspection exposes the 320-pixel production default missed by acceptance checks. |
| Sonnet | Reported session creation plus synthetic signed webhook tests and Prodigi acceptance | Fresh build passed and live page is 200. All Sessions are unpaid; synthetic orders used the icon; generated design is JPEG/opaque; no committed tests. |

No new paid transactions or print orders were created during the independent
audit. Existing Stripe objects, Prodigi orders, source images and thumbnails
were used. All seven production builds passed, all storefronts returned HTTP
200, and the live webhook probes behaved as recorded above.

## Token usage

`Fresh input` is the runner's normalized non-cache input figure. For Claude it
includes cache creation. Codex does not expose a separate cache-write count.

| Model | Fresh input | Cache reads | Cache creation/write | Output |
| --- | ---: | ---: | ---: | ---: |
| `gpt-6-astra` | 162,630 | 5,602,176 | Not reported | 49,018 |
| `gpt-5.6-sol` | 201,767 | 16,967,424 | Not reported | 57,626 |
| `gpt-5.6-terra` | 164,001 | 5,218,560 | Not reported | 30,379 |
| `gpt-5.6-luna` | 125,724 | 4,541,440 | Not reported | 24,746 |
| `claude-fable-5-1` | 163,535 | 7,946,764 | 161,223 | 95,394 |
| `claude-opus-5` | 216,203 | 17,263,397 | 215,955 | 148,222 |
| `claude-sonnet-5` | 168,273 | 8,071,757 | 168,121 | 90,463 |

## Sanity-check isolation

Every nonempty saved Stripe profile is permission-protected (`0600`) under
`.benchmark-secrets/stripe/`. Six models created distinct accounts. Luna's main
and wrapper profiles are empty and do not identify an account. Claimable
sandboxes expire on 2026-09-12.

| Model | Stripe account and observed objects | Registered webhook | Claim URL |
| --- | --- | --- | --- |
| Astra | `acct_1UCKlLGThrIkh3hB`; 4 Sessions, 3 PIs/charges (1 paid, 2 failed), 0 Customers | One enabled Checkout endpoint | [Claim Astra sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUNLbExHVGhySWtoM2hCLDE3ODkyMjg3NjIv100jEm8DNZj) |
| Sol | `acct_1UCHAhLRL0Px5WsW`; 2 unpaid Sessions, 0 PIs/charges/Customers | One enabled endpoint, but deployment secret is missing | [Claim Sol sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUNIQWhMUkwwUHg1V3NXLDE3ODkyMzEyNjUv100oyG7eN67) |
| Terra | `acct_1UC0X2L53O1Co5vd`; 2 unpaid Sessions, 0 PIs/charges/Customers | One enabled endpoint | [Claim Terra sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUMwWDJMNTNPMUNvNXZkLDE3ODkyMzI5NDEv100KnOY9sGF) |
| Luna | No usable account or key | None | Not available |
| Fable | `acct_1UCMfJKDECHlaNr7`; 17 Sessions, 1 paid PI/charge, 0 Customers | One enabled Checkout endpoint | [Claim Fable sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUNNZkpLREVDSGxhTnI3LDE3ODkyMzQ2NDUv100VI497jYz) |
| Opus | `acct_1UC6BMLWgjfAb5jE`; 33 PIs, 2 paid charges, 0 Sessions/Customers | One enabled PaymentIntent endpoint | [Claim Opus sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUM2Qk1MV2dqZkFiNWpFLDE3ODkyMzY4ODYv100Mdldn77z) |
| Sonnet | `acct_1UCLyiE70FBTHUtK`; 3 unpaid Sessions, 0 PIs/charges/Customers | One enabled Checkout endpoint | [Claim Sonnet sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUNMeWlFNzBGQlRIVXRLLDE3ODkyMzkwMjkv100qgX0oaZa) |

Prodigi was **not isolated**. Every run used the same supplied sandbox key and
shared account/order history. Attribution therefore used exact merchant
references, Stripe metadata, asset host, timestamps and run windows. Relevant
orders were Astra `ord_1170501`; Sol direct smoke `ord_1170506`; Luna direct
smoke `ord_1170508`; Fable paid `ord_1170515`; Opus paid `ord_1170523` and
`ord_1170525`; and Sonnet synthetic `ord_1170536–37`. Terra created no relevant
order. Sandbox acceptance does not establish live catalog availability,
physical placement, regional fulfillment, margin or print quality.

## Model handoff to a human

### Shared launch work

Claim the six usable Stripe sandboxes before 2026-09-12 or replace them with a
permanent account; Luna needs credentials and webhook setup from scratch. For a
chosen candidate, replace test Stripe credentials, register the same event set
in **live mode**, replace the Prodigi sandbox key, switch to Prodigi's live API,
and redeploy. Validate every garment SKU, fit, color, size and destination
against the live catalog/quote API, then order physical samples. Prices,
shipping options and variant maps are hard-coded and need code changes when the
catalog or economics change. Add taxes, receipts, terms, privacy, returns,
support, monitoring and a custom domain before public launch.

| Model | Required live configuration |
| --- | --- |
| Astra | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRODIGI_API_KEY`, `PRODIGI_ENV=live`, `SITE_URL`, `ARTWORK_SIGNING_SECRET`, `NEXT_PUBLIC_STORE_MODE=live`, and deliberate `LIVE_ORDERS_ENABLED` policy |
| Sol | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRODIGI_API_KEY`; verify the deployment gets the webhook secret and canonical host headers |
| Terra | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRODIGI_API_KEY`, `PRODIGI_BASE_URL=https://api.prodigi.com/v4.0`, `NEXT_PUBLIC_SITE_URL`, `ARTWORK_SIGNING_SECRET` |
| Luna | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRODIGI_API_KEY`, `NEXT_PUBLIC_APP_URL`; disable `CHECKOUT_DEMO_MODE` and change sandbox Prodigi base selection in code |
| Fable | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRODIGI_API_KEY`, `PRODIGI_API_BASE=https://api.prodigi.com/v4.0`, `NEXT_PUBLIC_SITE_URL` |
| Opus | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRODIGI_API_KEY`, `PRODIGI_API_BASE=https://api.prodigi.com/v4.0`, `NEXT_PUBLIC_SITE_URL`, `ARTWORK_SECRET` |
| Sonnet | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRODIGI_API_KEY`, `PRODIGI_API_BASE=https://api.prodigi.com/v4.0`, `NEXT_PUBLIC_SITE_URL`, plus Vercel Blob write credentials |

### Candidate-specific fixes before launch

- **Astra:** decide on and monitor the manual recovery procedure; verify both
  Gildan 64000 fit mappings and physical placement; keep its environment guards.
- **Sol:** provision the missing deployed webhook secret, resolve dependency
  audit findings, and prove a real paid flow rather than the direct smoke order.
- **Terra:** replace legacy shipping extraction, persist fulfillment state,
  expose recovery/status, resolve dependency findings, and prove paid→print E2E.
- **Luna:** configure Stripe, require paid state, add idempotency and durable
  order state, freeze the visible UI, print the raw epoch, use transparency, and
  validate the distinct fitted/unisex SKU maps.
- **Fable:** add committed automated tests and exercise duplicate delivery and
  failure recovery; verify the B+C 3001/6004 mappings by destination.
- **Opus:** fix the missing-width default so every Prodigi URL requests true
  production resolution, enforce timestamp freshness, and add automated tests.
- **Sonnet:** restrict art URLs to owned storage, use transparent PNG/WebP,
  explicitly verify payment, add true idempotency, return non-2xx or queue
  failures, and prove the generated art—not `/icon`—in a real paid order.

## Complexity

Counts exclude dependencies and generated build output. “Runtime” includes app
source/config needed to build and serve; “tests/verification” includes committed
test and operational verification scripts.

| Model | Runtime files | Runtime LOC | Test/verification files | Test/verification LOC | Total committed artifact files | Maintenance profile |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Astra | 23 | 3,687 | 8 | 590 | 55 | Largest operational safety surface among Codex entries: strong guards, scripts and tests, but more code and manual recovery concepts. |
| Sol | 19 | 1,115 | 0 | 0 | 24 | Moderate and readable; status retry is useful, but missing deployed config and no tests increase operating risk. |
| Terra | 16 | 343 | 0 | 0 | 18 | Smallest typed implementation, but state/recovery omissions push complexity onto operators. |
| Luna | 9 | 477 | 0 | 0 | 12 | Smallest artifact, but demo/config fallbacks and weak fulfillment invariants make production hardening substantial. |
| Fable | 26 | 2,114 | 0 | 0 | 30 | Broadest robust Checkout recovery without separate scripts; more routes/state paths to maintain. |
| Opus | 28 | 3,296 | 0 | 0 | 34 | Richest UI and direct-PI surface; custom payment/auth/artwork paths create the largest implementation burden and hid the resolution bug. |
| Sonnet | 26 | 1,881 | 0 | 0 | 28 | Browser art and Blob upload add a separate failure/security surface; current retry/idempotency gaps need redesign. |

