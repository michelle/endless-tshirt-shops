# Seven-model prompt-v2 second rerun — 2026-09-07

This is a new suite, separate from both earlier `prompt-v2` suites. It used the same committed prompt bytes at base revision `01bb32d2`, high reasoning for every model, and serial execution. All seven attempts succeeded after the Claude quota reset.

These results are directional case studies, not a formal ranking. A Prodigi sandbox `Complete` state proves API-side asset processing, not a printed or inspected physical shirt.

## Overview

| Model | Result | Elapsed | Storefront | Theme |
| --- | --- | ---: | --- | --- |
| gpt-6-astra | Succeeded | 16m55s | [HTTP 200](https://amateur-weather-club-20260907-r2-astra-7f4c.vercel.app) | Amateur Weather Club |
| gpt-5.6-sol | Succeeded | 26m31s | [HTTP 200](https://benchmark-20260907-prompt-v2-rerun2-rho.vercel.app) | Elsewhere Supply Co. |
| gpt-5.6-terra | Succeeded | 12m34s | [HTTP 200](https://benchmark-20260907-prompt-v2-rerun2-one.vercel.app) | Night Shift Field Club |
| gpt-5.6-luna | Succeeded | 22m54s | [HTTP 200](https://benchmark-20260907-prompt-v2-rerun2-plum.vercel.app) | Nightshift Supply |
| claude-fable-5-1 | Succeeded | 26m48s | [HTTP 200](https://benchmark-20260907-prompt-v2-rerun2-eta.vercel.app) | Department of Obsolete Futures |
| claude-opus-5 | Succeeded | 46m35s | [HTTP 200](https://benchmark-20260907-prompt-v2-rerun2-gamma.vercel.app) | The Order of Small Disasters |
| claude-sonnet-5 | Succeeded | 21m21s | [HTTP 200](https://benchmark-20260907-prompt-v2-rerun2-seven.vercel.app) | Bureau of Ordinary Monsters |

Fresh captures are 1440×900 with no browser errors. Fable and Opus published both favicons and social-preview images; Sonnet published a favicon; the four Codex storefronts published neither.

## Technology choices

| Model | Framework and major choices | Commerce shape |
| --- | --- | --- |
| Astra | Next.js 16.3, React 19.2, TypeScript, shadcn/Base UI dependencies, custom styling | Persistent client bag, server-authoritative Prodigi quotes/orders/status, body idempotency; no payment provider |
| Sol | Next.js 16.3, React 19.2, TypeScript, component-library scaffold | Three-product store with persistent cart and direct Prodigi sandbox order submission; no payment layer |
| Terra | Next.js 15.5, React 19.1, JavaScript, compact custom CSS | Single-design cart and direct Prodigi sandbox order route with body idempotency; no payment layer |
| Luna | Next.js 16.3, React 19.2, TypeScript, component-library scaffold | Client cart and direct Prodigi sandbox fulfillment; no payment layer; product mockup reused as print source |
| Fable | Next.js 16.3, React 19.2, TypeScript, Stripe SDK 22.6, custom SVG/PNG generation | Hosted Stripe Checkout, verified webhook and success-page recovery converging on idempotent Prodigi fulfillment; Prodigi as order system of record |
| Opus | Next.js 16.3, React 19.2, TypeScript, Sharp, Stripe SDK 22.6 | Live Prodigi quotes and direct sandbox orders; conditional Stripe path exists but was not configured or executed; no database |
| Sonnet | Next.js 16.3, React 19.2, TypeScript, generated PNG route | Local-storage cart, live Prodigi quote and direct sandbox order; no payment provider or durable order store |

## Third-party source and API callouts

Counts are aggregated by model across the three completed suites: prompt-v2 second rerun, prompt-v3 original, and prompt-v3 second rerun. Each grouped cell is **search queries / remote document requests / bundled or local reference reads**. Coverage is partial: a zero means no event was captured, not that a model relied on training data. Runtime API execution is evaluated separately in the payment and fulfillment findings.

| Model | Stripe (search / docs / refs) | Prodigi (search / docs / refs) | Frameworks (search / docs / refs) | All topics (search / docs / refs) | Research touches |
| --- | ---: | ---: | ---: | ---: | ---: |
| Astra | 7 / 3 / 3 | 12 / 2 / 1 | 0 / 0 / 3 | 19 / 5 / 7 | 31 |
| Sol | 2 / 0 / 5 | 15 / 1 / 4 | 1 / 0 / 0 | 18 / 1 / 9 | 28 |
| Terra | 2 / 0 / 0 | 21 / 0 / 0 | 0 / 0 / 0 | 23 / 0 / 0 | 23 |
| Luna | 1 / 0 / 1 | 11 / 0 / 0 | 0 / 0 / 0 | 12 / 0 / 1 | 13 |
| Fable | 0 / 0 / 4 | 0 / 0 / 1 | 0 / 0 / 7 | 0 / 0 / 12 | 12 |
| Opus | 0 / 0 / 0 | 1 / 4 / 0 | 0 / 0 / 0 | 1 / 4 / 0 | 5 |
| Sonnet | 0 / 0 / 0 | 2 / 6 / 0 | 0 / 1 / 0 | 2 / 7 / 0 | 9 |
| **All models** | **12 / 3 / 13** | **62 / 13 / 6** | **1 / 1 / 10** | **75 / 17 / 29** | **121** |

The prompt-v3 second-rerun contribution uses the successful Sonnet attempt selected by the viewer; its two provider-limit attempts are excluded. A returned result proves capture, not usefulness, comprehension, or integration correctness.

## Payment and fulfillment

Fable is the only run with verified payment evidence: two genuine $42.95 Stripe test Checkout Sessions reached `paid`, two PaymentIntents succeeded, the enabled webhook targeted the deployed origin, and each payment linked to a completed Prodigi order. The selected 4680×5790 print asset hash matches Prodigi.

Astra, Sol, Terra, Luna, Opus, and Sonnet did not collect payment. Their storefronts place Prodigi sandbox orders directly; Opus contains a conditional Stripe implementation that was never exercised. The selected direct orders for those six runs are useful fulfillment tests, but are not customer payment-to-print proof.

All selected submissions were accepted by Prodigi. Astra, Sol, Terra, Fable, and Opus reached complete asset preparation in the reviewed snapshot. Sonnet's latest order had downloaded the asset but had not yet completed print-ready preparation at snapshot time. Luna's order completed technically, but used the wrong asset class.

## Design correctness and print proof

The viewer preserves exact reviewed bytes without cropping, resizing, flattening, or recoloring.

| Model | Evidence | Canvas | Finding |
| --- | --- | --- | --- |
| Astra | Direct navy/XL order `ord_1170933`; Prodigi MD5 match | 1024×1536 RGBA | Coherent transparent outdoor illustration, but below recommended print-master resolution |
| Sol | Direct vintage-white/L order `ord_1170943`; Prodigi MD5 match | 1024×1536 RGBA | Strong transparent cloud-library art, but below the agent's own recommended 3307×4606 master |
| Terra | Committed source; MD5 matches orders `ord_1170945`/`ord_1170946` | 1024×1536 RGBA | Detailed transparent moth/observatory art, but web-resolution only |
| Luna | Direct black/M order `ord_1170950`; Prodigi MD5 match | 1254×1254 RGB, opaque | Wrong asset class: the submitted source is a complete shirt product mockup on a decorative background |
| Fable | Paid white/L order `ord_1170954`; Prodigi MD5 match | 4680×5790 RGBA | High-resolution transparent seal, designed for a light garment; physical placement still needs a sample |
| Opus | Direct charcoal/XL order `ord_1170971`; Prodigi MD5 match | 3600×4680 RGBA, 300 DPI metadata | Strong transparent print master with explicit print DPI; physical quality remains unverified |
| Sonnet | Direct navy/XL order `ord_1170976`; Prodigi MD5 match | 2000×2505 RGBA | Transparent generated badge; adequate for sandbox validation, but print scale and low-contrast details need a sample |

## Testing and independent checks

| Model | Agent-reported validation | Independent audit |
| --- | --- | --- |
| Astra | 33 deployed integration checks, including duplicate submission behavior | HTTP 200 capture; direct order asset hash matched; 1 verification file / 31 lines |
| Sol | Deployed customer flow and order `ord_1170943` | HTTP 200 capture and exact submitted asset match; no committed verification files |
| Terra | Deployed flow and order `ord_1170946` | HTTP 200 capture; committed source MD5 matches the order; no committed verification files |
| Luna | Deployed sandbox checkout | HTTP 200 capture and exact asset match exposed the mockup-as-print defect; no committed verification files |
| Fable | Browser E2E run through Stripe and Prodigi | HTTP 200 capture; two paid Sessions and matching complete orders; 3 verification files / 154 lines |
| Opus | Browser E2E plus four sandbox orders | HTTP 200 capture; selected order/source hash match; no paid Stripe evidence; no committed verification files |
| Sonnet | Command-line deployed flow and order `ord_1170976` | HTTP 200 capture and exact submitted asset match; no committed verification files |

## Token usage and complexity

| Model | New input | Cache read | Cache create/write | Output | Runtime files / lines | Verification files / lines |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Astra | 121,581 | 2,969,856 | 0 | 26,567 | 72 / 7,770 | 1 / 31 |
| Sol | 141,773 | 9,958,528 | 0 | 35,356 | 71 / 8,172 | 0 / 0 |
| Terra | 140,567 | 4,043,264 | 0 | 18,089 | 4 / 152 | 0 / 0 |
| Luna | 216,470 | 13,309,568 | 0 | 49,078 | 69 / 7,765 | 0 / 0 |
| Fable | 149,035 | 4,824,222 | 147,241 created | 93,632 | 32 / 1,887 | 3 / 154 |
| Opus | 219,616 | 20,124,364 | 219,312 created | 142,235 | 40 / 2,354 | 0 / 0 |
| Sonnet | 168,162 | 10,821,438 | 167,936 created | 92,387 | 20 / 1,765 | 0 / 0 |

Terra is by far the smallest implementation. Sol, Luna, and Astra include large generated component-library surfaces. Opus used the most time, output tokens, and Prodigi interactions; Fable produced the only committed end-to-end test suite and the only verified paid flow.

## Isolation and production handoff

Run IDs, prompt hash, base commit, reasoning level, Vercel project names, and deployment origins are distinct and consistent. Prodigi intentionally uses one shared sandbox account. Stripe identity is independently observable only for Fable; missing keys make the other Stripe profiles unknown rather than empty.

Before production, a human must add or finish payment gating for every run except Fable, use durable order/idempotency storage, configure live webhooks, reconcile fulfillment, add tax/email/legal/support flows, and replace all test credentials. Luna's mockup URLs must be replaced with isolated print artwork. Astra, Sol, and Terra need higher-resolution masters. Every design/garment/color combination still requires a physical sample for placement, opacity, color, and wash testing.

<!-- run-inspector:v1:start -->
## Automated inspection evidence

Snapshot: 2026-09-08T01:26:38.554Z. Suite: `20260907-prompt-v2-rerun2-high`. Artifact ref: `4d6dfb0ebe8fdfd98bd35f2ad8d6b8a9d3472e2f`. Inspector: `1.0.0`.

This is generated evidence, not a reviewed pass/fail rating. Searches do not prove reading or training-data reliance; paid Stripe objects do not prove the customer checkout flow. Live observations are later snapshots, not historical run-time evidence.

### Run and framework evidence

| Model | Run status | Seconds | Framework dependencies | Runtime files / lines | Verification files / lines |
| --- | --- | --- | --- | --- | --- |
| gpt-6-astra | succeeded | 1015 | next@^16.3.4, react@19.2.6, react-day-picker@9.8.1, react-dom@19.2.6, react-resizable-panels@4.5.8 | 72 / 7770 | 1 / 31 |
| gpt-5.6-sol | succeeded | 1591 | react@19.2.8, react-dom@19.2.8, react-server-dom-webpack@19.2.8, next@16.3.4, react-day-picker@9.8.1, react-resizable-panels@4.5.8 | 71 / 8172 | 0 / 0 |
| gpt-5.6-terra | succeeded | 754 | next@15.5.25, react@19.1.1, react-dom@19.1.1 | 4 / 152 | 0 / 0 |
| gpt-5.6-luna | succeeded | 1374 | next@^16.3.4, react@19.2.6, react-day-picker@9.8.1, react-dom@19.2.6, react-resizable-panels@4.5.8, react-server-dom-webpack@19.2.6 | 69 / 7765 | 0 / 0 |
| claude-fable-5-1 | succeeded | 1608 | next@16.3.4, react@19.2.8, react-dom@19.2.8, stripe@^22.6.1 | 32 / 1887 | 3 / 154 |
| claude-opus-5 | succeeded | 2795 | next@16.3.4, react@19.2.8, react-dom@19.2.8, sharp@^0.35.4, stripe@^22.6.1 | 40 / 2354 | 0 / 0 |
| claude-sonnet-5 | succeeded | 1281 | next@16.3.4, react@19.2.8, react-dom@19.2.8 | 20 / 1765 | 0 / 0 |

### Documentation-use evidence

Search counts are individual query requests. Reference requests/reads count tool calls, not unique pages. A returned tool result can be an error page or snippet; it is not proof of successful document retrieval. Raw queries, commands and tool outputs remain private.

| Model | Topic | Coverage | Search queries | Document requests | Local reference calls | Reference results available |
| --- | --- | --- | --- | --- | --- | --- |
| gpt-6-astra | stripe | observed_partial | 0 | 0 | 0 | 0 |
| gpt-6-astra | prodigi | observed_partial | 5 | 1 | 1 | 1 |
| gpt-6-astra | framework | observed_partial | 0 | 0 | 2 | 0 |
| gpt-5.6-sol | stripe | observed_partial | 0 | 0 | 0 | 0 |
| gpt-5.6-sol | prodigi | observed_partial | 5 | 0 | 0 | 0 |
| gpt-5.6-sol | framework | observed_partial | 0 | 0 | 0 | 0 |
| gpt-5.6-terra | stripe | observed_partial | 0 | 0 | 0 | 0 |
| gpt-5.6-terra | prodigi | observed_partial | 7 | 0 | 0 | 0 |
| gpt-5.6-terra | framework | observed_partial | 0 | 0 | 0 | 0 |
| gpt-5.6-luna | stripe | observed_partial | 0 | 0 | 0 | 0 |
| gpt-5.6-luna | prodigi | observed_partial | 4 | 0 | 0 | 0 |
| gpt-5.6-luna | framework | observed_partial | 0 | 0 | 0 | 0 |
| claude-fable-5-1 | stripe | observed_partial | 0 | 0 | 2 | 2 |
| claude-fable-5-1 | prodigi | observed_partial | 0 | 0 | 1 | 1 |
| claude-fable-5-1 | framework | observed_partial | 0 | 0 | 4 | 3 |
| claude-opus-5 | stripe | observed_partial | 0 | 0 | 0 | 0 |
| claude-opus-5 | prodigi | observed_partial | 1 | 3 | 0 | 3 |
| claude-opus-5 | framework | observed_partial | 0 | 0 | 0 | 0 |
| claude-sonnet-5 | stripe | observed_partial | 0 | 0 | 0 | 0 |
| claude-sonnet-5 | prodigi | observed_partial | 0 | 2 | 0 | 2 |
| claude-sonnet-5 | framework | observed_partial | 0 | 1 | 0 | 1 |

### Payment and fulfillment observations

| Model | Stripe evidence | Sessions / paid | PaymentIntents / succeeded | Linked Prodigi orders |
| --- | --- | --- | --- | --- |
| gpt-6-astra | No test key in saved profile | unknown | unknown | None observed; check coverage |
| gpt-5.6-sol | No test key in saved profile | unknown | unknown | None observed; check coverage |
| gpt-5.6-terra | No test key in saved profile | unknown | unknown | None observed; check coverage |
| gpt-5.6-luna | No test key in saved profile | unknown | unknown | None observed; check coverage |
| claude-fable-5-1 | Lists complete | 8 / 2 | 2 / 2 | ord_1170954: paid-stripe-object-linked; ord_1170953: paid-stripe-object-linked |
| claude-opus-5 | No test key in saved profile | unknown | unknown | None observed; check coverage |
| claude-sonnet-5 | No test key in saved profile | unknown | unknown | None observed; check coverage |

### Isolation evidence

Overall: **unknown**. Observed suite only; not proof of absence of all ambient-state contamination. The Prodigi sandbox is intentionally shared. Missing evidence never establishes account separation.

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
| profile/account agreement | unknown | 20260907-prompt-v2-rerun2-high-codex-gpt-6-astra | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260907-prompt-v2-rerun2-high-codex-gpt-6-astra | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260907-prompt-v2-rerun2-high-codex-gpt-6-astra | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260907-prompt-v2-rerun2-high-codex-gpt-5.6-sol | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260907-prompt-v2-rerun2-high-codex-gpt-5.6-sol | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260907-prompt-v2-rerun2-high-codex-gpt-5.6-sol | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260907-prompt-v2-rerun2-high-codex-gpt-5.6-terra | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260907-prompt-v2-rerun2-high-codex-gpt-5.6-terra | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260907-prompt-v2-rerun2-high-codex-gpt-5.6-terra | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260907-prompt-v2-rerun2-high-codex-gpt-5.6-luna | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260907-prompt-v2-rerun2-high-codex-gpt-5.6-luna | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260907-prompt-v2-rerun2-high-codex-gpt-5.6-luna | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260907-prompt-v2-rerun2-high-claude-claude-fable-5-1 | Live GET /v1/account versus saved profile identity |
| webhook destination | pass | 20260907-prompt-v2-rerun2-high-claude-claude-fable-5-1 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20260907-prompt-v2-rerun2-high-claude-claude-fable-5-1 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260907-prompt-v2-rerun2-high-claude-claude-opus-5 | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260907-prompt-v2-rerun2-high-claude-claude-opus-5 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260907-prompt-v2-rerun2-high-claude-claude-opus-5 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260907-prompt-v2-rerun2-high-claude-claude-sonnet-5 | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260907-prompt-v2-rerun2-high-claude-claude-sonnet-5 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260907-prompt-v2-rerun2-high-claude-claude-sonnet-5 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| cross-run Prodigi receipts | unknown |  | A single order must not be linked to Stripe objects from different runs |
| cross-run Stripe objects | unknown |  | Repeated object IDs across run profiles |
| cross-run source references | pass |  | Static source contains another inspected run ID or deployment; review hits before attribution |
| Prodigi account separation | shared |  | Harness intentionally supplies one shared Prodigi sandbox credential; orders are not account-isolated |

### Artwork evidence

No artwork is reconstructed or executed automatically. Reviewed selections preserve original bytes and canvas. Pixel statistics and a matching hash alone do not establish printable quality.

| Run | Source class | Canvas | Nontransparent pixels | Bounds | Prodigi hash match |
| --- | --- | --- | --- | --- | --- |
| 20260907-prompt-v2-rerun2-high-codex-gpt-6-astra | direct | 1024×1536 | 1023584 | [0,6,976,1491] | true |
| 20260907-prompt-v2-rerun2-high-codex-gpt-5.6-sol | direct | 1024×1536 | 643948 | [0,30,1004,1536] | true |
| 20260907-prompt-v2-rerun2-high-codex-gpt-5.6-terra | local | 1024×1536 | 902945 | [0,9,1004,1536] | not available |
| 20260907-prompt-v2-rerun2-high-codex-gpt-5.6-luna | direct | 1254×1254 | 1572516 | [0,0,1254,1254] | true |
| 20260907-prompt-v2-rerun2-high-claude-claude-fable-5-1 | paid-order | 4680×5790 | 2395427 | [554,648,4127,4592] | true |
| 20260907-prompt-v2-rerun2-high-claude-claude-opus-5 | direct | 3600×4680 | 3111887 | [268,148,3332,4680] | true |
| 20260907-prompt-v2-rerun2-high-claude-claude-sonnet-5 | direct | 2000×2505 | 2086892 | [123,251,1874,2002] | true |

### Review required

- Confirm payment-to-app-to-order provenance, variant/SKU mapping, artwork intent and physical print scale.
- Inspect artwork on dark and light backgrounds and compare fetched Prodigi thumbnails.
- Review source cues and capture gaps in inspection.json. No source cue is an automatic launch-blocker finding.
- Review retry/idempotency, paid-state guards, deployment environment configuration and cross-run references.
- Do not publish private snapshots, transcripts, profile files, signed source URLs or raw customer records.
<!-- run-inspector:v1:end -->
