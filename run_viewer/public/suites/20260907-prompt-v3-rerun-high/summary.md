# Prompt v3 — queued rerun

All seven high-reasoning model slots ran serially after the original suite. Five deployed successful storefronts. Opus hit the provider session limit after producing a partial workspace, and Sonnet hit the same limit immediately, so those two runs are retained as failures rather than silently omitted.

## Reviewed outcome

| Model | Store concept | Result | Payment / fulfillment evidence |
| --- | --- | --- | --- |
| gpt-6-astra | Field Notes Club | Deployed; payment blocked | Checkout and paid-only fulfillment implemented; no Stripe key or paid run |
| gpt-5.6-sol | Fieldmark | Deployed; payment blocked | Checkout and signed webhook implemented; no Stripe key or paid run |
| gpt-5.6-terra | Star Signal Studio | Deployed; payment blocked | Checkout and paid webhook implemented; no Stripe key or paid run |
| gpt-5.6-luna | Make It Yours | Deployed; payment blocked | Checkout and webhook fulfillment implemented; no Stripe key or paid run |
| claude-fable-5-1 | Orrery | Paid E2E | Two genuine paid checkouts linked to two Prodigi orders with completed asset downloads |
| claude-opus-5 | Partial build | Provider limit | No deployment or payment; partial Next.js/Stripe/Prodigi workspace retained |
| claude-sonnet-5 | No build | Provider limit | No workspace, deployment, payment, or fulfillment evidence |

The reviewed Orrery asset is a transparent 4677×5881 customer design from a paid order. Prodigi recorded the selected asset as downloaded and complete, but a later fetch of its deterministic live route produced different bytes from the hash Prodigi originally recorded. The viewer therefore shows the reviewed current rendering and discloses that mismatch rather than claiming an exact archived source match. Physical print quality remains unverified.

All five deployed storefront screenshots were captured on 2026-09-08 with HTTP 200 responses. Isolation checks passed for unique run IDs, profile paths, prompt hash, base commit, reasoning effort, and the paid Fable webhook destination. Overall isolation remains `unknown` because most Stripe identities were unavailable, two deployments do not exist, and Prodigi is intentionally shared.

## Audit note

The mandatory public-artifact scanner initially rejected Astra because generated test fixtures contained provider-shaped dummy secret strings. Only those synthetic fixture literals were renamed, the scanner was rerun, and the exact attempt artifact was published without rerunning the model. An archived whitespace warning was preserved.

## Production handoff

The payment-blocked stores need isolated Stripe test credentials and a genuine paid checkout before their commerce flows can pass. Orrery still needs live credentials, taxes and regional shipping economics, customer communications, legal pages, monitoring, and physical samples. The provider-limit runs are incomplete and have no deployable result.

<!-- run-inspector:v1:start -->
## Automated inspection evidence

Snapshot: 2026-09-08T08:06:50.618Z. Suite: `20260907-prompt-v3-rerun-high`. Artifact ref: `d725f327f215bf0fe829b99a7bd14a8c2576996b`. Inspector: `1.0.0`.

This is generated evidence, not a reviewed pass/fail rating. Searches do not prove reading or training-data reliance; paid Stripe objects do not prove the customer checkout flow. Live observations are later snapshots, not historical run-time evidence.

### Run and framework evidence

| Model | Run status | Seconds | Framework dependencies | Runtime files / lines | Verification files / lines |
| --- | --- | --- | --- | --- | --- |
| gpt-6-astra | succeeded | 1397 | next@^16.3.4, react@^19.2.8, react-dom@^19.2.8, sharp@^0.35.4, stripe@^22.6.1 | 17 / 2352 | 3 / 304 |
| gpt-5.6-sol | succeeded | 1549 | next@16.3.4, react@19.2.8, react-dom@19.2.8, sharp@^0.35.4, stripe@^22.6.1 | 13 / 623 | 0 / 0 |
| gpt-5.6-terra | succeeded | 570 | @resvg/resvg-js@^2.6.2, next@^15.2.4, react@^19.0.0, react-dom@^19.0.0, stripe@^17.7.0 | 8 / 248 | 0 / 0 |
| gpt-5.6-luna | succeeded | 1340 | next@^16.3.4, react@19.2.6, react-day-picker@9.8.1, react-dom@19.2.6, react-resizable-panels@4.5.8, react-server-dom-webpack@19.2.6, sharp@^0.35.4, stripe@^22.6.1 | 71 / 7902 | 0 / 0 |
| claude-fable-5-1 | succeeded | 1366 | @resvg/resvg-js@^2.6.2, next@15.5.25, react@19.1.0, react-dom@19.1.0, stripe@^22.6.1 | 22 / 1305 | 0 / 0 |
| claude-opus-5 | failed | 374 | @resvg/resvg-js@^2.6.2, next@16.3.4, react@19.2.8, react-dom@19.2.8, stripe@^22.6.1 | 8 / 311 | 0 / 0 |
| claude-sonnet-5 | failed | 1 |  | 0 / 0 | 0 / 0 |

### Documentation-use evidence

Search counts are individual query requests. Reference requests/reads count tool calls, not unique pages. A returned tool result can be an error page or snippet; it is not proof of successful document retrieval. Raw queries, commands and tool outputs remain private.

| Model | Topic | Coverage | Search queries | Document requests | Local reference calls | Reference results available |
| --- | --- | --- | --- | --- | --- | --- |
| gpt-6-astra | stripe | observed_partial | 1 | 0 | 0 | 0 |
| gpt-6-astra | prodigi | observed_partial | 3 | 2 | 0 | 1 |
| gpt-6-astra | framework | observed_partial | 0 | 0 | 0 | 0 |
| gpt-5.6-sol | stripe | observed_partial | 1 | 0 | 2 | 2 |
| gpt-5.6-sol | prodigi | observed_partial | 8 | 0 | 0 | 0 |
| gpt-5.6-sol | framework | observed_partial | 0 | 0 | 0 | 0 |
| gpt-5.6-terra | stripe | observed_partial | 1 | 0 | 0 | 0 |
| gpt-5.6-terra | prodigi | observed_partial | 7 | 0 | 0 | 0 |
| gpt-5.6-terra | framework | observed_partial | 0 | 0 | 0 | 0 |
| gpt-5.6-luna | stripe | observed_partial | 1 | 0 | 1 | 1 |
| gpt-5.6-luna | prodigi | observed_partial | 5 | 0 | 0 | 0 |
| gpt-5.6-luna | framework | observed_partial | 0 | 0 | 0 | 0 |
| claude-fable-5-1 | stripe | observed_partial | 0 | 0 | 0 | 0 |
| claude-fable-5-1 | prodigi | observed_partial | 1 | 2 | 0 | 2 |
| claude-fable-5-1 | framework | observed_partial | 0 | 0 | 0 | 0 |
| claude-opus-5 | stripe | observed_partial | 0 | 0 | 0 | 0 |
| claude-opus-5 | prodigi | observed_partial | 0 | 0 | 0 | 0 |
| claude-opus-5 | framework | observed_partial | 0 | 0 | 0 | 0 |
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
| claude-fable-5-1 | Lists complete | 9 / 2 | 2 / 2 | ord_1171025: paid-stripe-object-linked; ord_1171023: paid-stripe-object-linked |
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
| profile/account agreement | unknown | 20260907-prompt-v3-rerun-high-codex-gpt-6-astra | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260907-prompt-v3-rerun-high-codex-gpt-6-astra | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260907-prompt-v3-rerun-high-codex-gpt-6-astra | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260907-prompt-v3-rerun-high-codex-gpt-5.6-sol | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260907-prompt-v3-rerun-high-codex-gpt-5.6-sol | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260907-prompt-v3-rerun-high-codex-gpt-5.6-sol | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260907-prompt-v3-rerun-high-codex-gpt-5.6-terra | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260907-prompt-v3-rerun-high-codex-gpt-5.6-terra | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260907-prompt-v3-rerun-high-codex-gpt-5.6-terra | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260907-prompt-v3-rerun-high-codex-gpt-5.6-luna | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260907-prompt-v3-rerun-high-codex-gpt-5.6-luna | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260907-prompt-v3-rerun-high-codex-gpt-5.6-luna | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260907-prompt-v3-rerun-high-claude-claude-fable-5-1 | Live GET /v1/account versus saved profile identity |
| webhook destination | pass | 20260907-prompt-v3-rerun-high-claude-claude-fable-5-1 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20260907-prompt-v3-rerun-high-claude-claude-fable-5-1 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260907-prompt-v3-rerun-high-claude-claude-opus-5 | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260907-prompt-v3-rerun-high-claude-claude-opus-5 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260907-prompt-v3-rerun-high-claude-claude-opus-5 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260907-prompt-v3-rerun-high-claude-claude-sonnet-5 | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260907-prompt-v3-rerun-high-claude-claude-sonnet-5 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260907-prompt-v3-rerun-high-claude-claude-sonnet-5 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| cross-run Prodigi receipts | unknown |  | A single order must not be linked to Stripe objects from different runs |
| cross-run Stripe objects | unknown |  | Repeated object IDs across run profiles |
| cross-run source references | pass |  | Static source contains another inspected run ID or deployment; review hits before attribution |
| Prodigi account separation | shared |  | Harness intentionally supplies one shared Prodigi sandbox credential; orders are not account-isolated |
| source coverage | unknown |  | Some artifacts were excluded or runtime files unavailable |

### Artwork evidence

No artwork is reconstructed or executed automatically. Reviewed selections preserve original bytes and canvas. Pixel statistics and a matching hash alone do not establish printable quality.

| Run | Source class | Canvas | Nontransparent pixels | Bounds | Prodigi hash match |
| --- | --- | --- | --- | --- | --- |
| 20260907-prompt-v3-rerun-high-claude-claude-fable-5-1 | paid-order | 4677×5881 | 601624 | [376,367,4521,5291] | false |

### Review required

- Confirm payment-to-app-to-order provenance, variant/SKU mapping, artwork intent and physical print scale.
- Inspect artwork on dark and light backgrounds and compare fetched Prodigi thumbnails.
- Review source cues and capture gaps in inspection.json. No source cue is an automatic launch-blocker finding.
- Review retry/idempotency, paid-state guards, deployment environment configuration and cross-run references.
- Do not publish private snapshots, transcripts, profile files, signed source URLs or raw customer records.
<!-- run-inspector:v1:end -->
