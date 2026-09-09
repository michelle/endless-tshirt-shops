# Prompt v3 — second rerun

All seven model slots ran serially at high reasoning with adapter memory disabled. The original Sonnet run and its first retry hit the provider session limit; after the account upgrade, a second retry succeeded. The viewer now uses that successful immutable retry while all nine attempt artifacts remain archived.

## Reviewed outcome

| Model | Store concept | Result | Payment / fulfillment evidence |
| --- | --- | --- | --- |
| gpt-6-astra | Daymark | Paid E2E | One genuine paid checkout linked to a completed, exact-hash Prodigi asset |
| gpt-5.6-sol | Signal Atlas | Deployed; payment unverified | No inspectable Stripe profile or payment-linked Prodigi order |
| gpt-5.6-terra | Signal Foundry | Deployed; payment blocked | Stripe unavailable; catalog and quote checks only |
| gpt-5.6-luna | Signal Bloom | Deployed; payment blocked | Stripe unavailable; no attributable Prodigi order |
| claude-fable-5-1 | Under These Stars | Paid E2E with reliability warning | Four paid Sessions linked to orders; one asset completed and three reported errors |
| claude-opus-5 | The Isle of You | Paid E2E | Three paid Sessions linked to three completed Prodigi assets |
| claude-sonnet-5 | Skyprint | Paid E2E with reliability warning | Four succeeded PaymentIntents; three linked completed Prodigi assets, one earlier paid attempt remained unfulfilled |

Every deployment includes a representative image a customer can encounter. Astra, Fable, Opus, and Sonnet use exact paid-order sources whose MD5 hashes match Prodigi. Sol uses its exact live default SVG. Terra and Luna use verbatim live shirt previews because their separate fulfillment assets were not reached by a paid flow. These preview examples demonstrate the visible customer experience but are not payment or print-delivery proof.

All seven selected storefronts returned HTTP 200 on 2026-09-08. Isolation checks passed for unique run IDs, Vercel projects, Stripe profile paths, prompt hash, base commit, reasoning effort, enabled paid-run webhook destinations, and cross-run source references. Overall isolation remains `unknown` because several Stripe identities were unavailable and Prodigi is intentionally shared.

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

## Audit notes

Astra's publication initially stopped because its generated `.env.example` used provider-shaped dummy Stripe placeholders. Only those synthetic placeholders were renamed, the mandatory scanner passed, and the original attempt was published without rerunning the model.

Fable's publication stopped because its workspace contained a real local Stripe listener secret. That file was removed from public artifacts and retained only in the ignored private quarantine before the mandatory scanner passed. The model was not rerun. The first resume used tooling commit `1e9a34ac`; the second resume used `d3884b6e`, whose viewer-only layout change did not alter adapters or runner behavior. Every model still used the pinned base commit `1e9a34ac`, prompt hash `30868370…10f99`, high reasoning, and explicitly disabled memory.

Sonnet's first retry was rejected immediately by the same session limit. Attempt 3 ran after the account upgrade and completed in 1,496 seconds as immutable artifact commit `d76c3996`. It used the same pinned prompt, base commit, high reasoning, and explicitly disabled memory. Four genuine Stripe test PaymentIntents succeeded. Three link to completed Prodigi orders; the selected navy-blue/XL order `ord_1171112` fetched the archived 1600×2000 opaque PNG with an exact MD5 match. One earlier succeeded PaymentIntent remained `pending` without a linked Prodigi order, while a declined PaymentIntent produced no order. The enabled webhook targets the selected deployment. These observations support the completed path but also expose a reliability gap.

## Production handoff

Daymark and The Isle of You have the strongest observed commerce paths. Skyprint and Under These Stars each completed paid fulfillment but have reliability warnings that need root-cause work before launch. Skyprint also needs a higher-resolution print master; its exact paid source is 1600×2000 with 72 DPI metadata. All paid stores still require live credentials, tax and shipping validation, durable fulfillment state, customer communications, monitoring, and physical samples. The payment-blocked stores require a genuine Stripe test checkout and exact fulfillment-artwork audit before their commerce flows can pass.

<!-- run-inspector:v1:start -->
## Automated inspection evidence

Snapshot: 2026-09-08T20:04:44.159Z. Suite: `20260908-prompt-v3-rerun2-high`. Artifact ref: `d76c3996995c1597085aed975a1bae55a15466b1`. Inspector: `1.0.0`.

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
| claude-sonnet-5 | failed | 2 |  | 0 / 0 | 0 / 0 |
| claude-sonnet-5 | succeeded | 1496 | @stripe/react-stripe-js@^6.9.0, @stripe/stripe-js@^9.15.0, next@16.3.4, react@19.2.8, react-dom@19.2.8, stripe@^22.6.1 | 22 / 1843 | 0 / 0 |

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
| claude-sonnet-5 | stripe | unknown | unknown | unknown | unknown | unknown |
| claude-sonnet-5 | prodigi | unknown | unknown | unknown | unknown | unknown |
| claude-sonnet-5 | framework | unknown | unknown | unknown | unknown | unknown |
| claude-sonnet-5 | stripe | observed_partial | 0 | 0 | 0 | 0 |
| claude-sonnet-5 | prodigi | observed_partial | 0 | 0 | 0 | 0 |
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
| claude-sonnet-5 | No test key in saved profile | unknown | unknown | None observed; check coverage |
| claude-sonnet-5 | Lists complete | 0 / 0 | 5 / 4 | ord_1171115: paid-stripe-object-linked; ord_1171112: paid-stripe-object-linked; ord_1171111: paid-stripe-object-linked |

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
| profile/account agreement | unknown | 20260908-prompt-v3-rerun2-high-claude-claude-sonnet-5-attempt-2 | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260908-prompt-v3-rerun2-high-claude-claude-sonnet-5-attempt-2 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260908-prompt-v3-rerun2-high-claude-claude-sonnet-5-attempt-2 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260908-prompt-v3-rerun2-high-claude-claude-sonnet-5-attempt-3 | Live GET /v1/account versus saved profile identity |
| webhook destination | pass | 20260908-prompt-v3-rerun2-high-claude-claude-sonnet-5-attempt-3 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20260908-prompt-v3-rerun2-high-claude-claude-sonnet-5-attempt-3 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| cross-run Prodigi receipts | unknown |  | A single order must not be linked to Stripe objects from different runs |
| cross-run Stripe objects | unknown |  | Repeated object IDs across run profiles |
| cross-run source references | pass |  | Static source contains another inspected run ID or deployment; review hits before attribution |
| Prodigi account separation | shared |  | Harness intentionally supplies one shared Prodigi sandbox credential; orders are not account-isolated |
| source coverage | unknown |  | Some artifacts were excluded or runtime files unavailable |

### Artwork evidence

No artwork is reconstructed or executed automatically. Reviewed selections preserve original bytes and canvas. Pixel statistics and a matching hash alone do not establish printable quality.

| Run | Source class | Canvas | Nontransparent pixels | Bounds | Prodigi hash match |
| --- | --- | --- | --- | --- | --- |
| 20260908-prompt-v3-rerun2-high-codex-gpt-6-astra | paid-order | 2490×3510 | 688671 | [433,407,2258,3175] | true |
| 20260908-prompt-v3-rerun2-high-claude-claude-fable-5-1 | paid-order | 4665×5844 | 563043 | [602,204,4094,4621] | true |
| 20260908-prompt-v3-rerun2-high-claude-claude-opus-5 | paid-order | 3120×3860 | 842418 | [0,0,3120,3860] | true |
| 20260908-prompt-v3-rerun2-high-claude-claude-sonnet-5-attempt-3 | paid-order | 1600×2000 | 3200000 | [0,0,1600,2000] | true |

### Review required

- Confirm payment-to-app-to-order provenance, variant/SKU mapping, artwork intent and physical print scale.
- Inspect artwork on dark and light backgrounds and compare fetched Prodigi thumbnails.
- Review source cues and capture gaps in inspection.json. No source cue is an automatic launch-blocker finding.
- Review retry/idempotency, paid-state guards, deployment environment configuration and cross-run references.
- Do not publish private snapshots, transcripts, profile files, signed source URLs or raw customer records.
<!-- run-inspector:v1:end -->
