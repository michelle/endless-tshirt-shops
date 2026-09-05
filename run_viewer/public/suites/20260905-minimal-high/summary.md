# Seven-model minimal-prompt benchmark — 2026-09-05

This suite used `prompt-minimal.md`, suite ID `20260905-minimal-high`, base
commit `cbac7b4`, prompt SHA-256 `b211b5d8…`, and `high` reasoning for every
model. The seven models ran strictly one at a time in the requested order. Each
run used a distinct Vercel project and run-specific Stripe CLI profile; all
artifacts are consecutive commits on `benchmark-results`.

All seven agents exited successfully. Six followed the normal runner
publication path. Astra's implementation succeeded, but the runner stopped
after macOS regenerated an unrelated `.DS_Store`; the preserved artifact then
hit the same CRLF-only third-party font-license whitespace gate observed in the
beauty suite. The unchanged artifact passed the runner-equivalent secret scan
and was published from its recovery branch as commit `bc1b9ba`. Raw local
transcripts and recovery branches were removed afterward.

Independent inspection found four materially different outcomes:

- Astra completed three real paid Stripe checkouts, deliberately refunded one
  before printing, and sent the other two exact designs to Prodigi.
- Fable and Opus completed genuine paid PaymentIntent flows and sent visible,
  high-resolution transparent artwork to Prodigi. Opus initially created three
  duplicate orders for one payment before adding its current race protection.
- Terra completed two genuine paid PaymentIntent flows and Prodigi accepted
  both assets, but the inspected design occupies only a faint 167×13-pixel
  strip on a 2490×3510 canvas and is not meaningfully printable.
- Sol, Luna and Sonnet did not complete a genuine paid customer flow. Their
  direct or synthetic Prodigi orders are useful implementation checks, but are
  not paid end-to-end proof. Sol's actual smoke order used its opaque social
  preview instead of shirt art; Sonnet's signed synthetic event did submit its
  intended design.

These are directional case studies, not a formal ranking.

## Overview

| Model | Reasoning | Recorded status | Elapsed | Deployment | HTTP | Exact page title |
| --- | --- | --- | ---: | --- | ---: | --- |
| Codex `gpt-6-astra` | High | Succeeded; manual publication recovery | 27m 46s | <https://benchmark-20260905-minimal-high-cod.vercel.app> | 200 | `datetime.store — Wear this moment.` |
| Codex `gpt-5.6-sol` | High | Succeeded; no paid E2E | 24m 16s | <https://benchmark-20260905-minimal-high-cod-pi.vercel.app> | 200 | `datetime.store — wear the current moment` |
| Codex `gpt-5.6-terra` | High | Succeeded; paid flow, ineffective artwork | 13m 51s | <https://benchmark-20260905-minimal-high-cod-six.vercel.app> | 200 | `datetime.store — a shirt for right now` |
| Codex `gpt-5.6-luna` | High | Succeeded; no paid E2E | 10m 16s | <https://benchmark-20260905-minimal-high-cod-nu.vercel.app> | 200 | `datetime.store — the timestamp tee` |
| Claude `claude-fable-5-1` | High | Succeeded | 28m 45s | <https://benchmark-20260905-minimal-high-cla.vercel.app> | 200 | `the datetime store` |
| Claude `claude-opus-5` | High | Succeeded; duplicate-order incident fixed | 45m 56s | <https://benchmark-20260905-minimal-high-cla-ecru.vercel.app> | 200 | `the datetime store` |
| Claude `claude-sonnet-5` | High | Succeeded; no paid E2E | 17m 12s | <https://benchmark-20260905-minimal-high-cla-zeta.vercel.app> | 200 | `datetime.store — a t-shirt with this exact moment` |

The canonical aliases and titles above were independently fetched. Several raw
`metadata.json` deployment values contain adjacent completion-report Markdown;
this report intentionally uses the clean canonical URLs.

## Framework and major technology choices

| Model | Framework and UI | Payment surface | Artwork and state |
| --- | --- | --- | --- |
| Astra | Next.js 16.2.6, React 19.2.6, TypeScript | Stripe-hosted Checkout | Sharp SVG→PNG at 4677×5881; signed deterministic artwork; Session metadata stores fulfillment state; status and reconciliation routes; no database |
| Sol | Next.js 16.3.4, React 19.2.6, TypeScript | Stripe-hosted Checkout | Server-generated 4665×5844 transparent PNG; Session metadata and a status-route retry path; no database |
| Terra | Static HTML/JavaScript with Vercel serverless functions | Stripe Elements Card Element and direct PaymentIntents | Sharp 2490×3510 transparent PNG; PI metadata; no persisted Prodigi order result |
| Luna | Vite 6.4.3, React 19.2.8, JavaScript | Stripe-hosted Checkout | Sharp 2400×2900 transparent PNG; Session metadata; fulfillment result only logged |
| Fable | Next.js 15.5.25, React 19.2.8, TypeScript | Payment/Address/Express Elements and direct PaymentIntents | Sharp-style 3120×3860 transparent PNG; PI metadata stores shipping and result; browser finalization plus webhook |
| Opus | Next.js 16.3.4, React 19, TypeScript | PaymentElement and AddressElement with direct PaymentIntents | 3600×4800 transparent PNG; PI metadata acts as fulfillment receipt and recovery state |
| Sonnet | Next.js 16.3.4, React 19.2.8, TypeScript/Tailwind | Stripe-hosted Checkout | 2400×3000 transparent PNG; Session metadata; no durable Prodigi result or retry queue |

No runtime contains a Scalable Press network call. Implemented fulfillment
targets Prodigi's sandbox API.

## Stripe and payment evidence

| Model | Observed Stripe objects | Customer creation | Result |
| --- | --- | --- | --- |
| Astra | 5 Checkout Sessions: 3 paid/complete and 2 expired; 3 succeeded PIs/charges; 0 Customers | Omitted | Two paid purchases printed; the third was refunded before fulfillment as an explicit safety test. |
| Sol | 2 unpaid/open Sessions; 0 PIs, charges or Customers | `always` | No paid proof. Its registered production webhook cannot run because deployed configuration is missing. |
| Terra | 5 PaymentIntents: 2 succeeded, 3 require payment method; 2 paid charges; 0 Customers | Omitted | Two genuine payments and prints, but the art is effectively invisible. |
| Luna | 2 unpaid Sessions; 0 PIs, charges or Customers | `always` | No paid proof. Both fits map to one unisex SKU and garment configuration. |
| Fable | 8 PaymentIntents: 3 succeeded, 5 require payment method; 3 paid charges; 0 Customers | Omitted | One localhost-art failure and two completed paid prints. Shipping PII is stored in PI metadata. |
| Opus | 22 PaymentIntents: 5 succeeded, 17 require payment method; 5 paid charges; 0 Customers | Omitted | Paid prints completed, including the duplicate-race investigation and later protected orders. |
| Sonnet | 8 unpaid Sessions; 0 PIs, charges or Customers | Omitted | No paid proof; two Prodigi orders came from direct/signed synthetic testing. |

All storefronts charge $22.50 before any optional tax or shipping behavior. The
seven saved Stripe profiles identify seven distinct sandbox accounts, are mode
`0600`, and expire on 2026-09-12.

### Registered webhooks

| Model | Registered endpoint and events | Independent unsigned POST |
| --- | --- | ---: |
| Astra | One enabled `/api/stripe/webhook`; Checkout completed and async succeeded | 400 |
| Sol | One enabled `/api/webhooks/stripe`; both Checkout completion events | **400 — webhook not configured** |
| Terra | One enabled `/api/stripe-webhook`; PaymentIntent succeeded | 400 |
| Luna | One enabled `/api/stripe-webhook`; Checkout completed | 400 |
| Fable | One enabled `/api/webhooks/stripe`; PaymentIntent succeeded and failed | 400 |
| Opus | One enabled `/api/webhooks/stripe`; PaymentIntent succeeded and failed | 400 |
| Sonnet | One enabled `/api/webhook`; Checkout completed | 400 |

The signature-related responses reject unsigned traffic. Sol's response is a
deployment-configuration failure, so legitimate events are currently unusable
too.

## Application flow and recovery behavior

| Model | Exact runtime call order | Failure and recovery behavior |
| --- | --- | --- |
| Astra | Freeze `Date.now()` → optional Prodigi quote → hosted Checkout → paid webhook re-fetches and validates Session → refund guard → `POST /orders` → store Prodigi id/status/error → status and cron reconciliation | Session ID drives deterministic idempotency. Errors become retry state and non-2xx webhook responses. The refund-before-print test worked; two variants printed. |
| Sol | Freeze timestamp → hosted Checkout → webhook/status route re-fetches Session and verifies paid → `POST /Orders` → persist order id on Session | Session ID is the idempotency key and status polling can retry. No genuine payment occurred and deployed webhook configuration is missing. Its direct smoke order submitted `/og.png`, not the artwork route. |
| Terra | Capture timestamp at submit → create/confirm direct PI in Elements → browser fulfillment and PI-succeeded webhook each re-fetch paid PI → `POST /v4.0/Orders` | PI ID is the idempotency key, but order outcome is not persisted or exposed. The webhook catches broad failures and returns 400. Two paid orders exist. |
| Luna | Freeze timestamp when checkout modal opens → hosted Checkout → paid webhook → `POST /Orders` | Session is the idempotency key and errors return 500, but legacy shipping extraction and no durable result/recovery remain. The direct synthetic order bypassed Stripe. |
| Fable | Freeze timestamp → create/confirm PI with Elements → webhook or browser finalizer re-fetches succeeded PI → `POST /orders` → record result/error | PI ID is the idempotency key. Errors generally return 500; permanent validation failures are acknowledged. One paid localhost asset failed and two real hosted assets completed. |
| Opus | Freeze timestamp → Prodigi quote → create/confirm PI → webhook and buyer confirmation coordinate a fulfillment claim → prelookup by merchant reference → `POST /Orders` → record result | Current code uses a metadata lease, merchant-reference prelookup and PI idempotency. Earlier code created three duplicate orders for one PI. Prodigi exceptions are converted to `failed`, so the webhook can return 200 rather than trigger Stripe retry; manual/status recovery remains necessary. |
| Sonnet | Freeze timestamp at click → hosted Checkout → completion webhook validates metadata/shipping → `POST /orders` | Session is the merchant reference. Webhook does not explicitly require `payment_status=paid`, result is not persisted, and there is no retry/admin path. Only synthetic fulfillment was exercised. |

## Design correctness and print proof

The audit fetched representative source assets, decoded alpha, measured the
exclusive bounds of every nontransparent pixel, composited each full canvas on
a dark background, and visually inspected the result. The viewer shipped with
this suite uses these exact full canvases rather than cropped artwork, so the
observed print positioning is preserved.

| Model | Representative design | Source pixels and nontransparent bounds | Prodigi evidence | Print verdict |
| --- | --- | --- | --- | --- |
| Astra | raw epoch from paid fitted/S order `ord_1170539` | 4677×5881 RGBA; 196,598 nontransparent; `(1160,600)–(3517,812)` | Paid Session; order/source Complete; thumbnail fetched | Visible, high-resolution raw epoch with genuine transparency and good upper-chest placement. |
| Sol | locally reproduced exact route output from latest unpaid Session | 4665×5844 RGBA; 515,371 nontransparent; `(629,1560)–(4050,1889)` | No final design reached Prodigi. Smoke order `ord_1170542` used 1200×630 fully opaque `/og.png`. | Local design is clear and printable, but the observed order used the wrong image and no payment occurred. |
| Terra | paid fitted/M order `ord_1170543` | 2490×3510 RGBA; 1,067 nontransparent; `(1194,1496)–(1361,1509)` | Paid PI; source Complete; second paid order `ord_1170546` also completed | A nearly invisible, faint 167×13 strip. Technically transparent and accepted, but not meaningful shirt art. |
| Luna | direct synthetic order `ord_1170548` | 2400×2900 RGBA; 2,214 nontransparent; `(1006,1307)–(1399,1749)` | Source Complete; first verification order failed due to a malformed URL; no payment | Three tiny formatted lines, not a prominent raw epoch. Both UI fits use the same unisex SKU. |
| Fable | raw epoch from paid unisex/L order `ord_1170551` | 3120×3860 RGBA; 97,066 nontransparent; `(730,630)–(2389,775)` | Paid PI; order/source Complete; another paid fitted order completed | Visible high-resolution epoch on transparency with strong upper placement. |
| Opus | raw epoch from paid unisex/L order `ord_1170558` | 3600×4800 RGBA; 200,841 nontransparent; `(625,900)–(2985,1113)` | Paid PI; order/source Complete; multiple other paid orders completed | Visible high-resolution epoch on transparency with appropriate placement. |
| Sonnet | raw epoch from signed synthetic order `ord_1170560` | 2400×3000 RGBA; 60,954 nontransparent; `(686,919)–(1709,1268)` | Synthetic order/source Complete; no paid PI | Visible raw epoch plus readable human date on transparency, but customer payment was not proved. |

## Testing and independent confirmation

| Model | Fresh verification | Remaining gaps |
| --- | --- | --- |
| Astra | Production build passed; all 12 committed tests passed; live 200; paid/refund/print evidence independently confirmed | Physical sample, tax and asynchronous outage recovery remain untested. `npm audit` reports 1 low and 4 high vulnerabilities. |
| Sol | Production build passed; live 200; local art reproduced | No committed tests, no paid flow, broken deployed webhook configuration and wrong smoke-order image. |
| Terra | Production build passed; live 200; two payments/orders confirmed | `npm test` is advertised but no matching `test/*.test.js` exists, so it fails. Artwork is effectively invisible; no durable result. `npm audit` reports 1 high vulnerability. |
| Luna | Production build passed; live 200; corrected direct order inspected | No committed tests or paid flow; fit/SKU mismatch; art is extremely small. |
| Fable | Production build passed; all 5 committed tests passed; live 200; paid prints confirmed | Shipping PII in metadata and ambiguous browser-finalize authentication deserve remediation. `npm audit` reports 1 moderate and 1 high vulnerability. |
| Opus | Production build passed; live 200; paid prints and final race protection inspected | No committed tests; initial duplicate incident; webhook retry semantics do not match its comments. |
| Sonnet | Production build passed; live 200; synthetic signed fulfillment inspected | No committed tests, paid flow, persisted result, explicit paid-state guard or retry/admin path. |

No new transactions or print orders were created during the independent audit.
Existing Stripe objects, Prodigi orders, source images and thumbnails were used.

## Token usage

`Fresh input` is the runner's normalized non-cache input figure. For Claude it
includes cache creation. Codex does not expose a separate cache-write count.

| Model | Fresh input | Cache reads | Cache creation/write | Output |
| --- | ---: | ---: | ---: | ---: |
| `gpt-6-astra` | 178,442 | 6,146,816 | Not reported | 45,391 |
| `gpt-5.6-sol` | 257,296 | 15,370,240 | Not reported | 57,203 |
| `gpt-5.6-terra` | 130,296 | 4,182,784 | Not reported | 30,826 |
| `gpt-5.6-luna` | 118,367 | 2,932,480 | Not reported | 26,309 |
| `claude-fable-5-1` | 161,115 | 5,552,717 | 159,193 | 88,322 |
| `claude-opus-5` | 199,241 | 13,113,465 | 199,027 | 115,587 |
| `claude-sonnet-5` | 134,751 | 8,046,527 | 134,547 | 54,833 |

## Sanity-check isolation

| Model | Stripe account and observed objects | Claim URL |
| --- | --- | --- |
| Astra | `acct_1UBdWeEJLd5Cqd1X`; 5 Sessions, 3 paid PIs/charges | [Claim Astra sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUJkV2VFSkxkNUNxZDFYLDE3ODkyNDEzNTUv100yd0CUelC) |
| Sol | `acct_1UCPdAL9kFHWHer3`; 2 unpaid Sessions | [Claim Sol sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUNQZEFMOWtGSFdIZXIzLDE3ODkyNDMxMjMv100rvrQf3UC) |
| Terra | `acct_1UCQ4QCxQX1fsmb8`; 5 PIs, 2 paid charges | [Claim Terra sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUNRNFFDeFFYMWZzbWI4LDE3ODkyNDQ2MjIv100uFtvavf1) |
| Luna | `acct_1UCNweDtWC6mSYvV`; 2 unpaid Sessions | [Claim Luna sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUNOd2VEdFdDNm1TWXZWLDE3ODkyNDU0MTIv100JFv5EQDM) |
| Fable | `acct_1UCM4WCqyc15PQgz`; 8 PIs, 3 paid charges | [Claim Fable sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUNNNFdDcXljMTVQUWd6LDE3ODkyNDYxMjEv100XI0tRbDT) |
| Opus | `acct_1UCQ8ALszmJxGbyx`; 22 PIs, 5 paid charges | [Claim Opus sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUNROEFMc3ptSnhHYnl4LDE3ODkyNDgyMzUv100bdcB3QRh) |
| Sonnet | `acct_1UCQZJAUChPyFcIJ`; 8 unpaid Sessions | [Claim Sonnet sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUNRWkpBVUNoUHlGY0lKLDE3ODkyNTA2Njcv100Tfdn1Bq7) |

Prodigi was **not isolated**: every run used the supplied shared sandbox key and
account history. Attribution used merchant references, Stripe metadata, source
hosts and run windows. Relevant orders are Astra `ord_1170538–39`; Sol
`ord_1170542`; Terra `ord_1170543` and `ord_1170546`; Luna `ord_1170547–48`;
Fable `ord_1170549–51`; Opus `ord_1170552–58`; and Sonnet `ord_1170559–60`.
Sandbox acceptance does not establish physical placement, regional catalog
availability, margin or print quality.

## Model handoff to a human

Claim the Stripe sandboxes before 2026-09-12 or replace them with permanent
accounts. For any chosen candidate, replace Stripe test credentials, register
and verify the same webhook events in live mode, replace the Prodigi sandbox
key/base URL, validate each garment/color/size/destination through Prodigi's
live quote/catalog API, then order physical samples. Prices, shipping policy and
variant maps are hard-coded. Add tax, receipts, legal/support pages, monitoring
and a custom domain before public launch.

- **Astra:** resolve dependency findings, confirm the refund guard under real
  delayed events, and physically validate both garment cuts and placement.
- **Sol:** configure the deployed webhook, ensure fulfillment always uses the
  print-art route, add tests, and prove a real paid flow.
- **Terra:** fix artwork scale/opacity, persist fulfillment state and expose a
  recovery/status path; make webhook error classes deliberate.
- **Luna:** map fitted/unisex to real distinct garments, enlarge and simplify
  the raw-epoch art, modernize shipping extraction, persist results, and prove
  paid fulfillment.
- **Fable:** remove shipping PII from Stripe metadata, clarify authentication
  for browser finalization, exercise duplicates/outages, and resolve audits.
- **Opus:** retain the new lease/prelookup defense, add regression tests for the
  duplicate incident, and make transient failures return non-2xx or queue work.
- **Sonnet:** explicitly require paid state, persist Prodigi results, add real
  idempotency/retry/admin behavior, and prove a real Checkout payment.

## Complexity

Counts exclude dependencies and generated build output. Runtime includes source
and configuration required to build/serve; verification is committed test code.

| Model | Runtime files / lines | Verification files / lines | Workspace files | Artifact files |
| --- | ---: | ---: | ---: | ---: |
| Astra | 28 / 2,787 | 4 / 388 | 46 | 50 |
| Sol | 18 / 1,029 | 0 / 0 | 24 | 28 |
| Terra | 14 / 406 | 0 / 0 | 16 | 20 |
| Luna | 8 / 426 | 0 / 0 | 11 | 15 |
| Fable | 24 / 1,977 | 1 / 59 | 30 | 34 |
| Opus | 27 / 2,686 | 0 / 0 | 32 | 36 |
| Sonnet | 20 / 981 | 0 / 0 | 24 | 28 |
