# Seven-model prompt-v2 rerun — 2026-09-07

This is a fresh suite, separate from `20260907-prompt-v2-high`, using the same committed `prompt-v2.md` bytes at base revision `01bb32d2`. All attempts used high reasoning and ran serially. The four Codex models completed. Fable made substantial progress before the shared Claude session quota was exhausted; Opus and Sonnet then failed at startup with the same provider-limit message. No retries are folded into these results.

These are directional case studies, not a formal ranking. A Prodigi sandbox `Complete` state means the API accepted and processed an asset; it does not prove a physical shirt was printed or inspected.

## Overview

| Model | Result | Elapsed | Deployment / fresh capture | Exact page title |
| --- | --- | ---: | --- | --- |
| gpt-6-astra | Succeeded | 27m31s | [HTTP 200](https://benchmark-20260907-prompt-v2-rerun-high-codex-gpt-6-astra.vercel.app) | Off Hours Field Club — Good shirts. Better outside. |
| gpt-5.6-sol | Succeeded | 34m27s | [HTTP 200](https://benchmark-20260907-prompt-v2-rerun-five.vercel.app) | Night Shift Field Club — Original nocturnal field-art tees |
| gpt-5.6-terra | Succeeded | 11m56s | [HTTP 200](https://benchmark-20260907-prompt-v2-rerun-mu.vercel.app) | Night Shift Atlas — Shirts for the long way home |
| gpt-5.6-luna | Succeeded | 16m26s | [HTTP 200](https://benchmark-20260907-prompt-v2-rerun-lemon.vercel.app) | Night Market Signal — Drop 01 |
| claude-fable-5-1 | Failed: provider session limit | 15m12s | Not deployed | Not available |
| claude-opus-5 | Failed: provider session limit | 1s | Not deployed | Not available |
| claude-sonnet-5 | Failed: provider session limit | 1s | Not deployed | Not available |

The captures were taken at 1440×900 after the deployments settled. None of the four successful storefronts published a social-preview image. Astra published a favicon; the other three did not.

## Technology choices

| Model | Framework and major choices | Store and integration shape |
| --- | --- | --- |
| Astra | Next.js 16.3, React 19.2, TypeScript, Zod, Lucide; custom CSS | App Router server routes, local-storage bag/order links, Prodigi quotes/orders/status/cancel, simulated approve/decline payment, signed order access, body idempotency |
| Sol | Next.js 16.3, React 19.2, TypeScript, Tailwind 4, Base UI/shadcn, Lucide | App Router storefront and direct Prodigi sandbox order route; persistent cart; no payment layer |
| Terra | Next.js 14.2, React 18.3, JavaScript, custom CSS, Vercel Blob-hosted art | Small App Router build with one direct Prodigi order endpoint; client cart/checkout; no payment layer |
| Luna | Vinext 1 beta on Vite 8, React 19.2, Tailwind 4, shadcn/Base UI, Vercel functions | Single-page storefront with sheet cart and direct Prodigi sandbox order handler; no payment layer; product mockups reused as print sources |
| Fable | Next.js 15.5, React 19.1, TypeScript, Stripe SDK 22.6, `@resvg/resvg-js`, custom CSS | Partial App Router build with conditional hosted Stripe Checkout, paid-session verification, Stripe webhook, Prodigi quotes/orders/status, body idempotency, and SVG-to-PNG print generation; not deployed |
| Opus | None observed | Provider limit occurred before a workspace was created |
| Sonnet | None observed | Provider limit occurred before a workspace was created |

## Third-party source and API callouts

Counts below come from the normalized captured tool stream, not from final-answer claims. `S/D/L` means search queries / remote document requests / local reference reads. API interactions are runtime or command-line calls classified to that topic, not documentation reads. Coverage is partial for Astra through Fable; zero observed calls must not be interpreted as reliance on training data. Opus and Sonnet are **unknown**, not zero, because their provider sessions ended before usable history existed.

| Model | Stripe S/D/L; API calls | Prodigi S/D/L; API calls | Framework S/D/L; API calls | Failed/incomplete source calls |
| --- | --- | --- | --- | --- |
| Astra | 0/0/0; 1 | 4/2/0; 8 | 1/0/0; 2 | 0 observed |
| Sol | 0/0/0; 0 | 6/0/0; 3 | 0/0/2; 0 | 0 classified source calls; one separate MCP call failed |
| Terra | 0/0/0; 0 | 7/0/0; 5 | 0/0/0; 0 | 0 observed |
| Luna | 0/0/0; 0 | 6/0/0; 2 | 0/0/0; 0 | 0 observed |
| Fable | 0/0/0; 3 | 0/1/0; 7 | 0/0/0; 0 | 0 classified source calls before the terminal provider limit |
| Opus | unknown | unknown | unknown | unknown |
| Sonnet | unknown | unknown | unknown | unknown |

A returned result only proves that output was captured, not that it was useful or understood. Astra's two Prodigi document requests had request-only coverage; Fable's one Prodigi document request had a captured result. Sol's two framework references were local reads. The capture groups framework activity as a topic; exact installed framework and library choices are listed separately above.

## Payment and Prodigi flow

No successful Codex build used Stripe or another real payment processor. Their checkout UIs lead directly to Prodigi sandbox orders; Astra inserts a clearly labeled simulated approve/decline step. The saved Stripe profiles contain no usable test keys, so Stripe objects, account identity, customers, webhooks, and payment-event isolation are unknown rather than zero.

- **Astra:** calls Prodigi `POST /quotes`, then after a simulated approval calls `POST /orders`; it also implements `GET /orders/{id}` and `POST /orders/{id}/actions/cancel`. Orders `ord_1170912` and `ord_1170913` used the intended two-product cart; the latter completed. Body idempotency and a checkout ID reduce duplicate submissions, but there is no actual payment gate.
- **Sol:** posts directly to the sandbox orders endpoint. Customer-path black/M order `ord_1170918` completed with the intended Bella + Canvas 3001 source. There is no payment, quote step, durable database, status webhook, or refund path.
- **Terra:** posts directly to `v4.0/Orders`. Customer-path black/M order `ord_1170920` completed with the intended Bella + Canvas 3001 and Vercel Blob asset. There is no payment or durable order recovery.
- **Luna:** posts directly to `v4.0/Orders`. Orders `ord_1170922` and `ord_1170923` completed, but the code sends `/products/*.png` product mockups as front-print assets. No payment, quote, durable storage, idempotency key, or webhook exists.
- **Fable:** the partial code quotes before checkout, uses hosted Stripe Checkout only when a secret key exists, verifies `payment_status === "paid"`, and lets the webhook and success page converge on a body-idempotent Prodigi order. The shared sandbox contains probe orders during its time window, but no deployed customer flow or unambiguous run linkage was established before the provider limit.
- **Opus and Sonnet:** no application or API flow was produced.

No Scalable Press references were found in the committed runtime.

## Design correctness and print proof

The viewer preserves complete original canvases without cropping, resizing, flattening, or recoloring.

| Model | Selected evidence | Canvas and alpha | Finding |
| --- | --- | --- | --- |
| Astra | Exact Prodigi-fetched Natural/M source for `ord_1170913`; MD5 match | 1122×1402 RGB, fully opaque | Attractive vintage outdoor panel, but resolution and physical print size need a sample |
| Sol | Exact Prodigi-fetched black/M source for `ord_1170918`; MD5 match | 1024×1536 RGBA; 722,430 nontransparent pixels | Coherent transparent luna-moth art; lower resolution needs print-scale validation |
| Terra | Committed source byte-matched to `ord_1170920` | 4680×5848 RGBA; 14,363,475 nontransparent pixels | Detailed, transparent cosmic gas-station art; strongest print-file preparation of the completed stores |
| Luna | Committed source byte-matched to `ord_1170923` | 1254×1254 RGB, fully opaque | Wrong asset class: a complete cream-shirt product mockup would be printed on the shirt |
| Fable | Reviewed local partial-build print file | 4665×5844 RGBA; 14,521,186 nontransparent pixels | High-resolution transparent Dial-up Canyon art, but not deployed or tied to a customer order |
| Opus | None | None | Provider limit occurred before generation |
| Sonnet | None | None | Provider limit occurred before generation |

Prodigi reported completed asset download and print-ready preparation for the four customer-path Codex orders. That is API evidence only; no thumbnail or source dimensions can establish garment placement, color accuracy, or physical quality without ordering samples.

## Testing and independent checks

| Model | Agent validation | Independent audit |
| --- | --- | --- |
| Astra | Reported 10 automated tests and 25 deployed checks, including duplicate protection | HTTP 200 capture; two sandbox orders observed; selected source hash matches Prodigi; committed 2 verification files / 48 lines |
| Sol | Built/deployed and reported order `ord_1170918` | HTTP 200 capture and matching completed order; no committed verification files |
| Terra | Built/deployed and reported order `ord_1170920`; one pre-build start command failed and recovery continued | HTTP 200 capture and completed order; source MD5 matches; no committed verification files |
| Luna | Built/deployed and reported order `ord_1170923` | HTTP 200 capture and two completed orders; inspection exposes the submitted-mockup defect; no committed verification files |
| Fable | Partial development included a 386-line verification file and API activity | Source and tool stream inspected; no deployment, customer payment, or attributable order verified |
| Opus | None | Provider-limit final output only |
| Sonnet | None | Provider-limit final output only |

## Token usage and complexity

| Model | New input | Cache read | Cache write/create | Output | Runtime files / lines | Verification files / lines |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Astra | 138,977 | 4,408,320 | 0 | 46,575 | 25 / 200 | 2 / 48 |
| Sol | 185,264 | 11,178,624 | 0 | 47,245 | 69 / 7,965 | 0 / 0 |
| Terra | 132,498 | 3,822,336 | 0 | 23,023 | 5 / 150 | 0 / 0 |
| Luna | 218,972 | 9,021,056 | 0 | 37,570 | 70 / 7,772 | 0 / 0 |
| Fable | 96,751 | 861,104 | 96,109 created | 77,599 | 31 / 2,770 | 1 / 386 |
| Opus | 0 | 0 | 0 | 0 | 0 / 0 | 0 / 0 |
| Sonnet | 0 | 0 | 0 | 0 | 0 / 0 | 0 / 0 |

Sol and Luna include large generated component-library surfaces, which inflate file/line counts relative to Terra's deliberately compact build. Astra has the most explicit recovery/status behavior among completed stores. Fable has the most ambitious payment architecture, but its undeployed state prevents runtime conclusions.

## Isolation and production handoff

Run IDs, Vercel project names, prompt hash, base commit, and reasoning level are distinct/consistent where observable. Prodigi intentionally uses one shared sandbox account across runs. Stripe account identity and object isolation remain unknown because no usable test keys were saved. The four captured deployment origins are distinct; failed Claude attempts have none.

Before production, a human must:

1. Add a real payment provider and create Prodigi orders only after a verified, replay-safe paid event.
2. Use durable order/idempotency storage, register and monitor live webhooks, and implement reconciliation, cancellations, refunds, email, tax, privacy, and support flows.
3. Replace test credentials, claim/secure any sandbox accounts, and validate live Prodigi product SKUs, colors, sizes, shipping methods, and destination rules.
4. Replace Luna's mockup URLs with isolated high-resolution transparent print files. Validate Astra and Sol at intended physical dimensions.
5. Order physical samples for every garment/color/design combination and confirm placement, opacity, color, wash durability, and accessibility/device behavior.
6. Treat Fable as an unfinished partial build; rerun or finish deployment before relying on its Stripe/Prodigi design. Opus and Sonnet require fresh attempts after provider quota becomes available.

<!-- run-inspector:v1:start -->
## Automated inspection evidence

Snapshot: 2026-09-07T22:13:25.768Z. Suite: `20260907-prompt-v2-rerun-high`. Artifact ref: `ca0d28f8f8ebad2a80f88e30328fec5481d0d9e5`. Inspector: `1.0.0`.

This is generated evidence, not a reviewed pass/fail rating. Searches do not prove reading or training-data reliance; paid Stripe objects do not prove the customer checkout flow. Live observations are later snapshots, not historical run-time evidence.

### Run and framework evidence

| Model | Run status | Seconds | Framework dependencies | Runtime files / lines | Verification files / lines |
| --- | --- | --- | --- | --- | --- |
| gpt-6-astra | succeeded | 1651 | next@^16.3.4, react@^19.2.8, react-dom@^19.2.8 | 25 / 200 | 2 / 48 |
| gpt-5.6-sol | succeeded | 2067 | react@19.2.6, react-dom@19.2.6, next@16.3.4 | 69 / 7965 | 0 / 0 |
| gpt-5.6-terra | succeeded | 716 | next@14.2.35, react@18.3.1, react-dom@18.3.1 | 5 / 150 | 0 / 0 |
| gpt-5.6-luna | succeeded | 986 | react@19.2.6, react-dom@19.2.6, react-server-dom-webpack@19.2.6, react-day-picker@9.8.1, react-resizable-panels@4.5.8 | 70 / 7772 | 0 / 0 |
| claude-fable-5-1 | failed | 912 | @resvg/resvg-js@^2.6.2, next@15.5.25, react@19.1.0, react-dom@19.1.0, stripe@^22.6.1 | 31 / 2770 | 1 / 386 |
| claude-opus-5 | failed | 1 |  | 0 / 0 | 0 / 0 |
| claude-sonnet-5 | failed | 1 |  | 0 / 0 | 0 / 0 |

### Documentation-use evidence

Search counts are individual query requests. Reference requests/reads count tool calls, not unique pages. A returned tool result can be an error page or snippet; it is not proof of successful document retrieval. Raw queries, commands and tool outputs remain private.

| Model | Topic | Coverage | Search queries | Document requests | Local reference calls | Reference results available |
| --- | --- | --- | --- | --- | --- | --- |
| gpt-6-astra | stripe | observed_partial | 0 | 0 | 0 | 0 |
| gpt-6-astra | prodigi | observed_partial | 4 | 2 | 0 | 0 |
| gpt-6-astra | framework | observed_partial | 1 | 0 | 0 | 0 |
| gpt-5.6-sol | stripe | observed_partial | 0 | 0 | 0 | 0 |
| gpt-5.6-sol | prodigi | observed_partial | 6 | 0 | 0 | 0 |
| gpt-5.6-sol | framework | observed_partial | 0 | 0 | 2 | 2 |
| gpt-5.6-terra | stripe | observed_partial | 0 | 0 | 0 | 0 |
| gpt-5.6-terra | prodigi | observed_partial | 7 | 0 | 0 | 0 |
| gpt-5.6-terra | framework | observed_partial | 0 | 0 | 0 | 0 |
| gpt-5.6-luna | stripe | observed_partial | 0 | 0 | 0 | 0 |
| gpt-5.6-luna | prodigi | observed_partial | 6 | 0 | 0 | 0 |
| gpt-5.6-luna | framework | observed_partial | 0 | 0 | 0 | 0 |
| claude-fable-5-1 | stripe | observed_partial | 0 | 0 | 0 | 0 |
| claude-fable-5-1 | prodigi | observed_partial | 0 | 1 | 0 | 1 |
| claude-fable-5-1 | framework | observed_partial | 0 | 0 | 0 | 0 |
| claude-opus-5 | stripe | unknown | unknown | unknown | unknown | unknown |
| claude-opus-5 | prodigi | unknown | unknown | unknown | unknown | unknown |
| claude-opus-5 | framework | unknown | unknown | unknown | unknown | unknown |
| claude-sonnet-5 | stripe | unknown | unknown | unknown | unknown | unknown |
| claude-sonnet-5 | prodigi | unknown | unknown | unknown | unknown | unknown |
| claude-sonnet-5 | framework | unknown | unknown | unknown | unknown | unknown |

### Payment and fulfillment observations

| Model | Stripe evidence | Sessions / paid | PaymentIntents / succeeded | Linked Prodigi orders |
| --- | --- | --- | --- | --- |
| gpt-6-astra | No test key in saved profile | unknown | unknown | None observed; check coverage |
| gpt-5.6-sol | No test key in saved profile | unknown | unknown | None observed; check coverage |
| gpt-5.6-terra | No test key in saved profile | unknown | unknown | None observed; check coverage |
| gpt-5.6-luna | No test key in saved profile | unknown | unknown | None observed; check coverage |
| claude-fable-5-1 | No test key in saved profile | unknown | unknown | None observed; check coverage |
| claude-opus-5 | No test key in saved profile | unknown | unknown | None observed; check coverage |
| claude-sonnet-5 | No test key in saved profile | unknown | unknown | None observed; check coverage |

### Isolation evidence

Overall: **unknown**. Observed suite only; not proof of absence of all ambient-state contamination. The Prodigi sandbox is intentionally shared. Missing evidence never establishes account separation.

| Check | State | Runs | Evidence |
| --- | --- | --- | --- |
| run IDs | pass |  | Distinct across inspected runs |
| Vercel project names | pass |  | Distinct across inspected runs |
| deployment origins | unknown |  | Some identities unavailable |
| Stripe profile paths | pass |  | Distinct across inspected runs |
| Stripe account identities | unknown |  | Some identities unavailable |
| Stripe credentials | unknown |  | Some identities unavailable |
| consistent suite_id | pass |  | Compare immutable run metadata |
| consistent prompt_sha256 | pass |  | Compare immutable run metadata |
| consistent base_commit | pass |  | Compare immutable run metadata |
| consistent reasoning_effort | pass |  | Compare immutable run metadata |
| profile/account agreement | unknown | 20260907-prompt-v2-rerun-high-codex-gpt-6-astra | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260907-prompt-v2-rerun-high-codex-gpt-6-astra | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260907-prompt-v2-rerun-high-codex-gpt-6-astra | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260907-prompt-v2-rerun-high-codex-gpt-5.6-sol | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260907-prompt-v2-rerun-high-codex-gpt-5.6-sol | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260907-prompt-v2-rerun-high-codex-gpt-5.6-sol | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260907-prompt-v2-rerun-high-codex-gpt-5.6-terra | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260907-prompt-v2-rerun-high-codex-gpt-5.6-terra | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260907-prompt-v2-rerun-high-codex-gpt-5.6-terra | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260907-prompt-v2-rerun-high-codex-gpt-5.6-luna | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260907-prompt-v2-rerun-high-codex-gpt-5.6-luna | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260907-prompt-v2-rerun-high-codex-gpt-5.6-luna | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260907-prompt-v2-rerun-high-claude-claude-fable-5-1 | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260907-prompt-v2-rerun-high-claude-claude-fable-5-1 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260907-prompt-v2-rerun-high-claude-claude-fable-5-1 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260907-prompt-v2-rerun-high-claude-claude-opus-5 | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260907-prompt-v2-rerun-high-claude-claude-opus-5 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260907-prompt-v2-rerun-high-claude-claude-opus-5 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260907-prompt-v2-rerun-high-claude-claude-sonnet-5 | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260907-prompt-v2-rerun-high-claude-claude-sonnet-5 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260907-prompt-v2-rerun-high-claude-claude-sonnet-5 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| cross-run Prodigi receipts | unknown |  | A single order must not be linked to Stripe objects from different runs |
| cross-run Stripe objects | unknown |  | Repeated object IDs across run profiles |
| cross-run source references | pass |  | Static source contains another inspected run ID or deployment; review hits before attribution |
| Prodigi account separation | shared |  | Harness intentionally supplies one shared Prodigi sandbox credential; orders are not account-isolated |
| source coverage | unknown |  | Some artifacts were excluded or runtime files unavailable |

### Artwork evidence

No artwork is reconstructed or executed automatically. Reviewed selections preserve original bytes and canvas. Pixel statistics and a matching hash alone do not establish printable quality.

| Run | Source class | Canvas | Nontransparent pixels | Bounds | Prodigi hash match |
| --- | --- | --- | --- | --- | --- |
| 20260907-prompt-v2-rerun-high-codex-gpt-6-astra | direct | 1122×1402 | 1573044 | [0,0,1122,1402] | true |
| 20260907-prompt-v2-rerun-high-codex-gpt-5.6-sol | direct | 1024×1536 | 722430 | [41,0,983,1536] | true |
| 20260907-prompt-v2-rerun-high-codex-gpt-5.6-terra | local | 4680×5848 | 14363475 | [0,67,4413,5740] | not available |
| 20260907-prompt-v2-rerun-high-codex-gpt-5.6-luna | local | 1254×1254 | 1572516 | [0,0,1254,1254] | not available |
| 20260907-prompt-v2-rerun-high-claude-claude-fable-5-1 | local | 4665×5844 | 14521186 | [682,420,3983,4820] | not available |

### Review required

- Confirm payment-to-app-to-order provenance, variant/SKU mapping, artwork intent and physical print scale.
- Inspect artwork on dark and light backgrounds and compare fetched Prodigi thumbnails.
- Review source cues and capture gaps in inspection.json. No source cue is an automatic launch-blocker finding.
- Review retry/idempotency, paid-state guards, deployment environment configuration and cross-run references.
- Do not publish private snapshots, transcripts, profile files, signed source URLs or raw customer records.
<!-- run-inspector:v1:end -->
