# Prompt v3 — second rerun

All seven model slots ran serially at high reasoning with adapter memory disabled. Six produced deployed storefronts. Sonnet built for twelve minutes before the provider session limit ended the attempt, so its partial workspace is retained as a failure rather than silently omitted.

## Reviewed outcome

| Model | Store concept | Result | Payment / fulfillment evidence |
| --- | --- | --- | --- |
| gpt-6-astra | Daymark | Paid E2E | One genuine paid checkout linked to a completed, exact-hash Prodigi asset |
| gpt-5.6-sol | Signal Atlas | Deployed; payment unverified | No inspectable Stripe profile or payment-linked Prodigi order |
| gpt-5.6-terra | Signal Foundry | Deployed; payment blocked | Stripe unavailable; catalog and quote checks only |
| gpt-5.6-luna | Signal Bloom | Deployed; payment blocked | Stripe unavailable; no attributable Prodigi order |
| claude-fable-5-1 | Under These Stars | Paid E2E with reliability warning | Four paid Sessions linked to orders; one asset completed and three reported errors |
| claude-opus-5 | The Isle of You | Paid E2E | Three paid Sessions linked to three completed Prodigi assets |
| claude-sonnet-5 | Partial custom store | Provider limit | No deployment, payment, customer artwork, or attributable order |

Every successful deployment includes a representative image a customer can encounter. Astra, Fable, and Opus use exact paid-order sources whose MD5 hashes match Prodigi. Sol uses its exact live default SVG. Terra and Luna use verbatim live shirt previews because their separate fulfillment assets were not reached by a paid flow. These preview examples demonstrate the visible customer experience but are not payment or print-delivery proof.

All six storefront screenshots returned HTTP 200 on 2026-09-08. Isolation checks passed for unique run IDs, Vercel projects, Stripe profile paths, prompt hash, base commit, reasoning effort, enabled paid-run webhook destinations, and cross-run source references. Overall isolation remains `unknown` because several Stripe identities were unavailable and Prodigi is intentionally shared.

## Audit notes

Astra's publication initially stopped because its generated `.env.example` used provider-shaped dummy Stripe placeholders. Only those synthetic placeholders were renamed, the mandatory scanner passed, and the original attempt was published without rerunning the model.

Fable's publication stopped because its workspace contained a real local Stripe listener secret. That file was removed from public artifacts and retained only in the ignored private quarantine before the mandatory scanner passed. The model was not rerun. The first resume used tooling commit `1e9a34ac`; the second resume used `d3884b6e`, whose viewer-only layout change did not alter adapters or runner behavior. Every model still used the pinned base commit `1e9a34ac`, prompt hash `30868370…10f99`, high reasoning, and explicitly disabled memory.

## Production handoff

Daymark and The Isle of You have the strongest observed commerce paths. Under These Stars also completed one full paid fulfillment, but its three earlier paid-order asset failures need root-cause work before launch. All paid stores still require live credentials, tax and shipping validation, durable fulfillment state, customer communications, monitoring, and physical samples. The payment-blocked stores require a genuine Stripe test checkout and exact fulfillment-artwork audit before their commerce flows can pass.

<!-- run-inspector:v1:start -->
## Automated inspection evidence

Snapshot: 2026-09-08T17:22:12.960Z. Suite: `20260908-prompt-v3-rerun2-high`. Artifact ref: `33680d111edac5aa123fcd22ecfe27ee4f3d29bc`. Inspector: `1.0.0`.

This is generated evidence, not a reviewed pass/fail rating. Searches do not prove reading or training-data reliance; paid Stripe objects do not prove the customer checkout flow. Live observations are later snapshots, not historical run-time evidence.

### Run and framework evidence

| Model | Run status | Seconds | Framework dependencies | Runtime files / lines | Verification files / lines |
| --- | --- | --- | --- | --- | --- |
| gpt-6-astra | succeeded | 1612 | next@16.3.4, react@^19.2.0, react-dom@^19.2.0, sharp@^0.35.4, stripe@^18.5.0 | 17 / 181 | 9 / 89 |
| gpt-5.6-sol | succeeded | 2115 | next@16.3.4, react@19.2.8, react-dom@19.2.8, sharp@^0.35.4, stripe@^22.6.1 | 19 / 529 | 0 / 0 |
| gpt-5.6-terra | succeeded | 557 | next@16.3.4, react@19.2.8, react-dom@19.2.8, stripe@17.7.0 | 11 / 256 | 0 / 0 |
| gpt-5.6-luna | succeeded | 1175 |  | 6 / 340 | 0 / 0 |
| claude-fable-5-1 | succeeded | 2089 | @resvg/resvg-js@^2.6.2, next@16.3.4, react@19.2.8, react-dom@19.2.8, stripe@^22.6.1 | 28 / 1912 | 3 / 119 |
| claude-opus-5 | succeeded | 2827 | @resvg/resvg-wasm@^2.6.2, next@^16.3.4, react@19.1.0, react-dom@19.1.0, stripe@^18.5.0 | 18 / 2261 | 4 / 60 |
| claude-sonnet-5 | failed | 720 | next@15.5.25, react@^18.3.1, react-dom@^18.3.1, @resvg/resvg-js@^2.6.2, stripe@^16.12.0 | 4 / 248 | 0 / 0 |

### Documentation-use evidence

Search counts are individual query requests. Reference requests/reads count tool calls, not unique pages. A returned tool result can be an error page or snippet; it is not proof of successful document retrieval. Raw queries, commands and tool outputs remain private.

| Model | Topic | Coverage | Search queries | Document requests | Local reference calls | Reference results available |
| --- | --- | --- | --- | --- | --- | --- |
| gpt-6-astra | stripe | observed_partial | 5 | 3 | 2 | 2 |
| gpt-6-astra | prodigi | observed_partial | 2 | 0 | 0 | 0 |
| gpt-6-astra | framework | observed_partial | 0 | 0 | 0 | 0 |
| gpt-5.6-sol | stripe | observed_partial | 1 | 0 | 3 | 2 |
| gpt-5.6-sol | prodigi | observed_partial | 7 | 0 | 1 | 1 |
| gpt-5.6-sol | framework | observed_partial | 0 | 0 | 0 | 0 |
| gpt-5.6-terra | stripe | observed_partial | 0 | 0 | 0 | 0 |
| gpt-5.6-terra | prodigi | observed_partial | 7 | 0 | 0 | 0 |
| gpt-5.6-terra | framework | observed_partial | 0 | 0 | 0 | 0 |
| gpt-5.6-luna | stripe | observed_partial | 1 | 0 | 0 | 0 |
| gpt-5.6-luna | prodigi | observed_partial | 5 | 0 | 0 | 0 |
| gpt-5.6-luna | framework | observed_partial | 0 | 0 | 0 | 0 |
| claude-fable-5-1 | stripe | observed_partial | 0 | 0 | 1 | 1 |
| claude-fable-5-1 | prodigi | observed_partial | 0 | 0 | 0 | 0 |
| claude-fable-5-1 | framework | observed_partial | 0 | 0 | 3 | 3 |
| claude-opus-5 | stripe | observed_partial | 0 | 0 | 0 | 0 |
| claude-opus-5 | prodigi | observed_partial | 0 | 0 | 0 | 0 |
| claude-opus-5 | framework | observed_partial | 0 | 0 | 0 | 0 |
| claude-sonnet-5 | stripe | observed_partial | 0 | 0 | 0 | 0 |
| claude-sonnet-5 | prodigi | observed_partial | 1 | 4 | 0 | 4 |
| claude-sonnet-5 | framework | observed_partial | 0 | 0 | 0 | 0 |

### Payment and fulfillment observations

| Model | Stripe evidence | Sessions / paid | PaymentIntents / succeeded | Linked Prodigi orders |
| --- | --- | --- | --- | --- |
| gpt-6-astra | Lists complete | 2 / 1 | 2 / 1 | ord_1171056: paid-stripe-object-linked |
| gpt-5.6-sol | No test key in saved profile | unknown | unknown | None observed; check coverage |
| gpt-5.6-terra | No test key in saved profile | unknown | unknown | None observed; check coverage |
| gpt-5.6-luna | No test key in saved profile | unknown | unknown | None observed; check coverage |
| claude-fable-5-1 | Lists complete | 9 / 4 | 4 / 4 | ord_1171080: paid-stripe-object-linked; ord_1171078: paid-stripe-object-linked; ord_1171077: paid-stripe-object-linked; ord_1171073: paid-stripe-object-linked |
| claude-opus-5 | Lists complete | 14 / 3 | 3 / 3 | ord_1171090: paid-stripe-object-linked; ord_1171086: paid-stripe-object-linked; ord_1171085: paid-stripe-object-linked |
| claude-sonnet-5 | Lists complete | 0 / 0 | 0 / 0 | None observed; check coverage |

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
| profile/account agreement | unknown | 20260908-prompt-v3-rerun2-high-codex-gpt-6-astra | Live GET /v1/account versus saved profile identity |
| webhook destination | pass | 20260908-prompt-v3-rerun2-high-codex-gpt-6-astra | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20260908-prompt-v3-rerun2-high-codex-gpt-6-astra | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260908-prompt-v3-rerun2-high-codex-gpt-5.6-sol | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260908-prompt-v3-rerun2-high-codex-gpt-5.6-sol | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260908-prompt-v3-rerun2-high-codex-gpt-5.6-sol | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260908-prompt-v3-rerun2-high-codex-gpt-5.6-terra | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260908-prompt-v3-rerun2-high-codex-gpt-5.6-terra | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260908-prompt-v3-rerun2-high-codex-gpt-5.6-terra | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260908-prompt-v3-rerun2-high-codex-gpt-5.6-luna | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260908-prompt-v3-rerun2-high-codex-gpt-5.6-luna | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260908-prompt-v3-rerun2-high-codex-gpt-5.6-luna | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260908-prompt-v3-rerun2-high-claude-claude-fable-5-1 | Live GET /v1/account versus saved profile identity |
| webhook destination | pass | 20260908-prompt-v3-rerun2-high-claude-claude-fable-5-1 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20260908-prompt-v3-rerun2-high-claude-claude-fable-5-1 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260908-prompt-v3-rerun2-high-claude-claude-opus-5 | Live GET /v1/account versus saved profile identity |
| webhook destination | pass | 20260908-prompt-v3-rerun2-high-claude-claude-opus-5 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20260908-prompt-v3-rerun2-high-claude-claude-opus-5 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260908-prompt-v3-rerun2-high-claude-claude-sonnet-5 | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260908-prompt-v3-rerun2-high-claude-claude-sonnet-5 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20260908-prompt-v3-rerun2-high-claude-claude-sonnet-5 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| cross-run Prodigi receipts | unknown |  | A single order must not be linked to Stripe objects from different runs |
| cross-run Stripe objects | unknown |  | Repeated object IDs across run profiles |
| cross-run source references | pass |  | Static source contains another inspected run ID or deployment; review hits before attribution |
| Prodigi account separation | shared |  | Harness intentionally supplies one shared Prodigi sandbox credential; orders are not account-isolated |

### Artwork evidence

No artwork is reconstructed or executed automatically. Reviewed selections preserve original bytes and canvas. Pixel statistics and a matching hash alone do not establish printable quality.

| Run | Source class | Canvas | Nontransparent pixels | Bounds | Prodigi hash match |
| --- | --- | --- | --- | --- | --- |
| 20260908-prompt-v3-rerun2-high-codex-gpt-6-astra | paid-order | 2490×3510 | 688671 | [433,407,2258,3175] | true |
| 20260908-prompt-v3-rerun2-high-claude-claude-fable-5-1 | paid-order | 4665×5844 | 563043 | [602,204,4094,4621] | true |
| 20260908-prompt-v3-rerun2-high-claude-claude-opus-5 | paid-order | 3120×3860 | 842418 | [0,0,3120,3860] | true |

### Review required

- Confirm payment-to-app-to-order provenance, variant/SKU mapping, artwork intent and physical print scale.
- Inspect artwork on dark and light backgrounds and compare fetched Prodigi thumbnails.
- Review source cues and capture gaps in inspection.json. No source cue is an automatic launch-blocker finding.
- Review retry/idempotency, paid-state guards, deployment environment configuration and cross-run references.
- Do not publish private snapshots, transcripts, profile files, signed source URLs or raw customer records.
<!-- run-inspector:v1:end -->
