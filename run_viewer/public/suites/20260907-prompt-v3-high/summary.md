# Prompt v3 — original suite

All seven high-reasoning runs finished and deployed distinct, personalized DTG storefronts. Five runs implemented Stripe but could not exercise payment because their isolated profiles had no test key. Opus and Sonnet provisioned isolated Stripe sandboxes and completed genuine hosted test payments that linked to Prodigi sandbox orders.

## Reviewed outcome

| Model | Store concept | Result | Payment / fulfillment evidence |
| --- | --- | --- | --- |
| gpt-6-astra | Personal Orbit | Deployed; payment blocked | Checkout and paid-only fulfillment implemented; no Stripe key or paid run |
| gpt-5.6-sol | ORBIT/ONE | Deployed; payment blocked | Checkout and signed webhook implemented; no Stripe key or paid run |
| gpt-5.6-terra | The 5:17 Club | Deployed; payment blocked | Checkout and paid webhook implemented; no Stripe key or paid run |
| gpt-5.6-luna | Signal / Noise | Deployed; payment blocked | Checkout and signed webhook implemented; no Stripe key or paid run |
| claude-fable-5-1 | Bloomprint | Deployed; payment blocked | Local guard tests and a direct sandbox asset check; no paid checkout |
| claude-opus-5 | Cryptidæ | Paid E2E | Two $48 test checkouts linked to two Prodigi orders with completed asset downloads |
| claude-sonnet-5 | Seed & Ink | Paid E2E | One paid checkout linked to a front-and-back Prodigi order with completed asset downloads |

The archived Opus and Sonnet designs are exact source-byte matches for the selected paid Prodigi assets. They are transparent, high-resolution customer designs, not storefront mockups. Physical placement and DTG output remain unverified because the Prodigi sandbox does not manufacture shirts.

All storefront screenshots were captured from the deployed sites on 2026-09-08 with HTTP 200 responses. Isolation checks passed for distinct run IDs, Vercel projects/origins, profile paths, prompt hash, base commit, and reasoning effort. Overall isolation remains `unknown` because five Stripe identities were unavailable and the Prodigi sandbox is intentionally shared.

## Audit note

The mandatory public-artifact scanner initially rejected Astra and Fable because generated test fixtures contained provider-shaped dummy secret strings. Only those synthetic fixture literals were renamed, the scanner was rerun, and the exact attempt artifacts were then published without rerunning either model. Astra's deployment URL was also normalized to remove trailing prose punctuation; the runner now performs that normalization automatically.

## Production handoff

Every storefront still needs live Stripe and Prodigi credentials, tax and shipping policy, legal/support pages, monitoring, and physical samples. The five payment-blocked runs also need a complete test payment before their checkout or fulfillment claims can be accepted. Opus and Sonnet have the strongest end-to-end sandbox evidence, but neither is launch-certified.

<!-- run-inspector:v1:start -->
## Automated inspection evidence

Snapshot: 2026-09-08T08:06:48.567Z. Suite: `20260907-prompt-v3-high`. Artifact ref: `d725f327f215bf0fe829b99a7bd14a8c2576996b`. Inspector: `1.0.0`.

This is generated evidence, not a reviewed pass/fail rating. Searches do not prove reading or training-data reliance; paid Stripe objects do not prove the customer checkout flow. Live observations are later snapshots, not historical run-time evidence.

### Run and framework evidence

| Model | Run status | Seconds | Framework dependencies | Runtime files / lines | Verification files / lines |
| --- | --- | --- | --- | --- | --- |
| gpt-6-astra | succeeded | 1701 | next@^16.3.4, react@19.2.6, react-day-picker@9.8.1, react-dom@19.2.6, react-resizable-panels@4.5.8, sharp@^0.35.4, stripe@^22.6.1 | 82 / 7934 | 3 / 124 |
| gpt-5.6-sol | succeeded | 1617 | next@16.3.4, react@19.2.8, react-dom@19.2.8, sharp@^0.35.4, stripe@^22.6.1 | 13 / 647 | 0 / 0 |
| gpt-5.6-terra | succeeded | 603 | next@16.3.4, react@19.2.8, react-dom@19.2.8, stripe@^22.6.1 | 14 / 150 | 0 / 0 |
| gpt-5.6-luna | succeeded | 630 | next@^16.3.4, react@^19.2.8, react-dom@^19.2.8, sharp@^0.35.4, stripe@^22.6.1 | 7 / 296 | 0 / 0 |
| claude-fable-5-1 | succeeded | 1218 | @resvg/resvg-js@^2.6.2, next@15.5.25, react@19.1.0, react-dom@19.1.0, stripe@^22.6.1 | 27 / 2227 | 4 / 77 |
| claude-opus-5 | succeeded | 3787 | @resvg/resvg-js@^2.6.2, next@^15.5.25, react@19.1.0, react-dom@19.1.0, sharp@^0.34.2, stripe@^18.5.0 | 22 / 3643 | 5 / 285 |
| claude-sonnet-5 | succeeded | 1745 | next@14.2.35, react@^18.3.1, react-dom@^18.3.1, stripe@^16.9.0 | 24 / 1622 | 0 / 0 |

### Documentation-use evidence

Search counts are individual query requests. Reference requests/reads count tool calls, not unique pages. A returned tool result can be an error page or snippet; it is not proof of successful document retrieval. Raw queries, commands and tool outputs remain private.

| Model | Topic | Coverage | Search queries | Document requests | Local reference calls | Reference results available |
| --- | --- | --- | --- | --- | --- | --- |
| gpt-6-astra | stripe | observed_partial | 2 | 0 | 1 | 1 |
| gpt-6-astra | prodigi | observed_partial | 5 | 1 | 0 | 0 |
| gpt-6-astra | framework | observed_partial | 0 | 0 | 1 | 1 |
| gpt-5.6-sol | stripe | observed_partial | 1 | 0 | 2 | 2 |
| gpt-5.6-sol | prodigi | observed_partial | 3 | 1 | 3 | 4 |
| gpt-5.6-sol | framework | observed_partial | 1 | 0 | 0 | 0 |
| gpt-5.6-terra | stripe | observed_partial | 2 | 0 | 0 | 0 |
| gpt-5.6-terra | prodigi | observed_partial | 7 | 0 | 0 | 0 |
| gpt-5.6-terra | framework | observed_partial | 0 | 0 | 0 | 0 |
| gpt-5.6-luna | stripe | observed_partial | 0 | 0 | 1 | 1 |
| gpt-5.6-luna | prodigi | observed_partial | 2 | 0 | 0 | 0 |
| gpt-5.6-luna | framework | observed_partial | 0 | 0 | 0 | 0 |
| claude-fable-5-1 | stripe | observed_partial | 0 | 0 | 1 | 1 |
| claude-fable-5-1 | prodigi | observed_partial | 0 | 0 | 0 | 0 |
| claude-fable-5-1 | framework | observed_partial | 0 | 0 | 0 | 0 |
| claude-opus-5 | stripe | observed_partial | 0 | 0 | 0 | 0 |
| claude-opus-5 | prodigi | observed_partial | 0 | 1 | 0 | 1 |
| claude-opus-5 | framework | observed_partial | 0 | 0 | 0 | 0 |
| claude-sonnet-5 | stripe | observed_partial | 0 | 0 | 0 | 0 |
| claude-sonnet-5 | prodigi | observed_partial | 2 | 4 | 0 | 4 |
| claude-sonnet-5 | framework | observed_partial | 0 | 0 | 0 | 0 |

### Payment and fulfillment observations

| Model | Stripe evidence | Sessions / paid | PaymentIntents / succeeded | Linked Prodigi orders |
| --- | --- | --- | --- | --- |
| gpt-6-astra | No test key in saved profile | unknown | unknown | None observed; check coverage |
| gpt-5.6-sol | No test key in saved profile | unknown | unknown | None observed; check coverage |
| gpt-5.6-terra | No test key in saved profile | unknown | unknown | None observed; check coverage |
| gpt-5.6-luna | No test key in saved profile | unknown | unknown | None observed; check coverage |
| claude-fable-5-1 | No test key in saved profile | unknown | unknown | None observed; check coverage |
| claude-opus-5 | Lists complete | 9 / 2 | 2 / 2 | ord_1171012: paid-stripe-object-linked; ord_1171010: paid-stripe-object-linked |
| claude-sonnet-5 | Lists complete | 5 / 1 | 1 / 1 | ord_1171015: paid-stripe-object-linked |

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
| profile/account agreement | unknown | 20260907-prompt-v3-high-codex-gpt-6-astra | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260907-prompt-v3-high-codex-gpt-6-astra | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260907-prompt-v3-high-codex-gpt-6-astra | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260907-prompt-v3-high-codex-gpt-5.6-sol | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260907-prompt-v3-high-codex-gpt-5.6-sol | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260907-prompt-v3-high-codex-gpt-5.6-sol | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260907-prompt-v3-high-codex-gpt-5.6-terra | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260907-prompt-v3-high-codex-gpt-5.6-terra | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260907-prompt-v3-high-codex-gpt-5.6-terra | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260907-prompt-v3-high-codex-gpt-5.6-luna | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260907-prompt-v3-high-codex-gpt-5.6-luna | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260907-prompt-v3-high-codex-gpt-5.6-luna | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260907-prompt-v3-high-claude-claude-fable-5-1 | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260907-prompt-v3-high-claude-claude-fable-5-1 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260907-prompt-v3-high-claude-claude-fable-5-1 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260907-prompt-v3-high-claude-claude-opus-5 | Live GET /v1/account versus saved profile identity |
| webhook destination | pass | 20260907-prompt-v3-high-claude-claude-opus-5 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20260907-prompt-v3-high-claude-claude-opus-5 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260907-prompt-v3-high-claude-claude-sonnet-5 | Live GET /v1/account versus saved profile identity |
| webhook destination | pass | 20260907-prompt-v3-high-claude-claude-sonnet-5 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20260907-prompt-v3-high-claude-claude-sonnet-5 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| cross-run Prodigi receipts | unknown |  | A single order must not be linked to Stripe objects from different runs |
| cross-run Stripe objects | unknown |  | Repeated object IDs across run profiles |
| cross-run source references | pass |  | Static source contains another inspected run ID or deployment; review hits before attribution |
| Prodigi account separation | shared |  | Harness intentionally supplies one shared Prodigi sandbox credential; orders are not account-isolated |

### Artwork evidence

No artwork is reconstructed or executed automatically. Reviewed selections preserve original bytes and canvas. Pixel statistics and a matching hash alone do not establish printable quality.

| Run | Source class | Canvas | Nontransparent pixels | Bounds | Prodigi hash match |
| --- | --- | --- | --- | --- | --- |
| 20260907-prompt-v3-high-claude-claude-opus-5 | paid-order | 4680×5790 | 3224934 | [670,625,4010,5165] | true |
| 20260907-prompt-v3-high-claude-claude-sonnet-5 | paid-order | 3000×3750 | 1800651 | [0,0,3000,3678] | true |

### Review required

- Confirm payment-to-app-to-order provenance, variant/SKU mapping, artwork intent and physical print scale.
- Inspect artwork on dark and light backgrounds and compare fetched Prodigi thumbnails.
- Review source cues and capture gaps in inspection.json. No source cue is an automatic launch-blocker finding.
- Review retry/idempotency, paid-state guards, deployment environment configuration and cross-run references.
- Do not publish private snapshots, transcripts, profile files, signed source URLs or raw customer records.
<!-- run-inspector:v1:end -->
