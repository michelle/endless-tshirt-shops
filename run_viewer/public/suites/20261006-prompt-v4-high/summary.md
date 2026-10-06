# 20261006-prompt-v4-high Prompt v4 suite

[Compare all three Prompt v4 suites](/suites/20261006-prompt-v4-high/charts/)

This is automated evidence pending human review; it is not a model ranking or launch certification.

<!-- run-inspector:v1:start -->
## Automated inspection evidence

Snapshot: 2026-10-06T13:41:13.766Z. Suite: `20261006-prompt-v4-high`. Artifact ref: `1e662def8622d73c5ac985133e29858ad37e4b25`. Inspector: `1.0.0`.

This is generated evidence, not a reviewed pass/fail rating. Searches do not prove reading or training-data reliance; paid Stripe objects do not prove the customer checkout flow. Live observations are later snapshots, not historical run-time evidence.

### Run and framework evidence

| Model | Run status | Agent deployment | Harness inspection deployment | Seconds | Framework dependencies | Runtime files / lines | Verification files / lines |
| --- | --- | --- | --- | --- | --- | --- | --- |
| gpt-6-astra | succeeded | reported | succeeded | 529 | next@16.3.4, next-themes@^0.4.6, react@19.2.6, react-day-picker@^10.0.1, react-dom@19.2.6, react-hook-form@^7.85.0, react-resizable-panels@^4.12.2 | 89 / 9010 | 12 / 1124 |
| gpt-6.1-sol | succeeded | reported | succeeded | 692 |  | 3 / 523 | 4 / 90 |
| gpt-6-luna | succeeded | reported | succeeded | 462 |  | 1 / 206 | 1 / 25 |
| claude-fable-5-1 | succeeded | reported | failed | 1519 | @resvg/resvg-js@^2.6.2, stripe@^23.0.0 | 8 / 1170 | 0 / 0 |
| claude-opus-5-5 | succeeded | reported | succeeded | 1698 | @resvg/resvg-wasm@^2.6.2, stripe@^23.0.0 | 22 / 11081 | 3 / 85 |
| claude-sonnet-5-5 | succeeded | reported | failed | 1182 | sharp@^0.35.5, stripe@^23.0.0 | 21 / 1756 | 2 / 138 |
| kimi-code/k3 | failed | reported | succeeded | 2826 | sharp@^0.33.5 | 23 / 18818 | 0 / 0 |
| opencode/glm-5.3#high | succeeded | reported | succeeded | 3061 | @resvg/resvg-wasm@^2.6.2 | 15 / 2087 | 5 / 282 |
| opencode/deepseek-v4.1-flash | succeeded | reported | succeeded | 1157 | stripe@^17.7.0 | 11 / 1851 | 5 / 209 |
| opencode/qwen3.8-max | succeeded | not_reported | failed | 1404 | @resvg/resvg-js@^2.6.2, stripe@^23.0.0 | 11 / 1910 | 5 / 389 |
| opencode/minimax-m3 | failed | not_reported | failed | 4441 | @resvg/resvg-js@^2.6.2, next@14.2.15, react@^18.3.1, react-dom@^18.3.1, stripe@^17.2.1 | 29 / 2612 | 0 / 0 |
| opencode/gemini-3.8-flash | succeeded | reported | succeeded | 1604 | stripe@^23.0.0 | 13 / 2351 | 2 / 274 |
| opencode/grok-4.7 | failed | not_reported | failed | 5521 | @resvg/resvg-js@^2.6.2, next@^15.5.4, react@^19.1.1, react-dom@^19.1.1, stripe@^17.7.0 | 30 / 2532 | 1 / 65 |

### Documentation-use evidence

Search counts are individual query requests. Reference requests/reads count tool calls, not unique pages. A returned tool result can be an error page or snippet; it is not proof of successful document retrieval. Raw queries, commands and tool outputs remain private.

| Model | Topic | Coverage | Search queries | Document requests | Local reference calls | Reference results available |
| --- | --- | --- | --- | --- | --- | --- |
| gpt-6-astra | stripe | observed_partial | 7 | 4 | 0 | 1 |
| gpt-6-astra | prodigi | observed_partial | 2 | 2 | 0 | 2 |
| gpt-6-astra | framework | observed_partial | 0 | 0 | 0 | 0 |
| gpt-6.1-sol | stripe | observed_partial | 2 | 0 | 0 | 0 |
| gpt-6.1-sol | prodigi | observed_partial | 3 | 1 | 0 | 0 |
| gpt-6.1-sol | framework | observed_partial | 0 | 0 | 0 | 0 |
| gpt-6-luna | stripe | observed_partial | 2 | 0 | 0 | 0 |
| gpt-6-luna | prodigi | observed_partial | 5 | 0 | 0 | 0 |
| gpt-6-luna | framework | observed_partial | 0 | 0 | 0 | 0 |
| claude-fable-5-1 | stripe | observed_partial | 0 | 1 | 0 | 1 |
| claude-fable-5-1 | prodigi | observed_partial | 0 | 0 | 0 | 0 |
| claude-fable-5-1 | framework | observed_partial | 0 | 0 | 0 | 0 |
| claude-opus-5-5 | stripe | observed_partial | 1 | 0 | 0 | 0 |
| claude-opus-5-5 | prodigi | observed_partial | 0 | 0 | 0 | 0 |
| claude-opus-5-5 | framework | observed_partial | 0 | 0 | 0 | 0 |
| claude-sonnet-5-5 | stripe | observed_partial | 0 | 0 | 0 | 0 |
| claude-sonnet-5-5 | prodigi | observed_partial | 0 | 1 | 0 | 1 |
| claude-sonnet-5-5 | framework | observed_partial | 0 | 0 | 0 | 0 |
| kimi-code/k3 | stripe | observed_partial | 0 | 0 | 0 | 0 |
| kimi-code/k3 | prodigi | observed_partial | 0 | 0 | 0 | 0 |
| kimi-code/k3 | framework | observed_partial | 0 | 0 | 0 | 0 |
| opencode/glm-5.3#high | stripe | observed_partial | 0 | 2 | 0 | 2 |
| opencode/glm-5.3#high | prodigi | observed_partial | 2 | 3 | 0 | 1 |
| opencode/glm-5.3#high | framework | observed_partial | 0 | 0 | 0 | 0 |
| opencode/deepseek-v4.1-flash | stripe | observed_partial | 0 | 0 | 0 | 0 |
| opencode/deepseek-v4.1-flash | prodigi | observed_partial | 0 | 0 | 0 | 0 |
| opencode/deepseek-v4.1-flash | framework | observed_partial | 0 | 0 | 0 | 0 |
| opencode/qwen3.8-max | stripe | observed_partial | 0 | 0 | 0 | 0 |
| opencode/qwen3.8-max | prodigi | observed_partial | 1 | 5 | 0 | 5 |
| opencode/qwen3.8-max | framework | observed_partial | 0 | 0 | 0 | 0 |
| opencode/minimax-m3 | stripe | observed_partial | 0 | 0 | 0 | 0 |
| opencode/minimax-m3 | prodigi | observed_partial | 0 | 0 | 0 | 0 |
| opencode/minimax-m3 | framework | observed_partial | 0 | 0 | 0 | 0 |
| opencode/gemini-3.8-flash | stripe | observed_partial | 0 | 0 | 0 | 0 |
| opencode/gemini-3.8-flash | prodigi | observed_partial | 0 | 0 | 0 | 0 |
| opencode/gemini-3.8-flash | framework | observed_partial | 0 | 0 | 0 | 0 |
| opencode/grok-4.7 | stripe | observed_partial | 0 | 0 | 0 | 0 |
| opencode/grok-4.7 | prodigi | observed_partial | 3 | 1 | 0 | 1 |
| opencode/grok-4.7 | framework | observed_partial | 0 | 0 | 0 | 0 |

### Payment and fulfillment observations

| Model | Stripe evidence | Sessions / paid | PaymentIntents / succeeded | Linked Prodigi orders |
| --- | --- | --- | --- | --- |
| gpt-6-astra | No test key in saved profile | unknown | unknown | None observed; check coverage |
| gpt-6.1-sol | No test key in saved profile | unknown | unknown | None observed; check coverage |
| gpt-6-luna | No test key in saved profile | unknown | unknown | None observed; check coverage |
| claude-fable-5-1 | No test key in saved profile | unknown | unknown | None observed; check coverage |
| claude-opus-5-5 | No test key in saved profile | unknown | unknown | None observed; check coverage |
| claude-sonnet-5-5 | No test key in saved profile | unknown | unknown | None observed; check coverage |
| kimi-code/k3 | No test key in saved profile | unknown | unknown | None observed; check coverage |
| opencode/glm-5.3#high | No test key in saved profile | unknown | unknown | None observed; check coverage |
| opencode/deepseek-v4.1-flash | No test key in saved profile | unknown | unknown | None observed; check coverage |
| opencode/qwen3.8-max | No test key in saved profile | unknown | unknown | None observed; check coverage |
| opencode/minimax-m3 | No test key in saved profile | unknown | unknown | None observed; check coverage |
| opencode/gemini-3.8-flash | Lists complete | 4 / 1 | 1 / 1 | ord_1178099: paid-stripe-object-linked |
| opencode/grok-4.7 | Lists complete | 1 / 0 | 0 / 0 | None observed; check coverage |

### Isolation evidence

Overall: **fail**. Observed suite only; not proof of absence of all ambient-state contamination. The Prodigi sandbox is intentionally shared. Missing evidence never establishes account separation.

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
| profile/account agreement | unknown | 20261006-prompt-v4-high-codex-gpt-6-astra | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261006-prompt-v4-high-codex-gpt-6-astra | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261006-prompt-v4-high-codex-gpt-6-astra | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261006-prompt-v4-high-codex-gpt-6.1-sol | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261006-prompt-v4-high-codex-gpt-6.1-sol | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261006-prompt-v4-high-codex-gpt-6.1-sol | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261006-prompt-v4-high-codex-gpt-6-luna | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261006-prompt-v4-high-codex-gpt-6-luna | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261006-prompt-v4-high-codex-gpt-6-luna | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261006-prompt-v4-high-claude-claude-fable-5-1 | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261006-prompt-v4-high-claude-claude-fable-5-1 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261006-prompt-v4-high-claude-claude-fable-5-1 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261006-prompt-v4-high-claude-claude-opus-5-5 | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261006-prompt-v4-high-claude-claude-opus-5-5 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261006-prompt-v4-high-claude-claude-opus-5-5 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261006-prompt-v4-high-claude-claude-sonnet-5-5 | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261006-prompt-v4-high-claude-claude-sonnet-5-5 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261006-prompt-v4-high-claude-claude-sonnet-5-5 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261006-prompt-v4-high-kimi-kimi-code-k3 | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261006-prompt-v4-high-kimi-kimi-code-k3 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261006-prompt-v4-high-kimi-kimi-code-k3 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261006-prompt-v4-high-opencode-opencode-glm-5.3-high | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261006-prompt-v4-high-opencode-opencode-glm-5.3-high | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261006-prompt-v4-high-opencode-opencode-glm-5.3-high | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261006-prompt-v4-high-opencode-opencode-deepseek-v4.1-flash | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261006-prompt-v4-high-opencode-opencode-deepseek-v4.1-flash | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261006-prompt-v4-high-opencode-opencode-deepseek-v4.1-flash | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261006-prompt-v4-high-opencode-opencode-qwen3.8-max | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261006-prompt-v4-high-opencode-opencode-qwen3.8-max | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261006-prompt-v4-high-opencode-opencode-qwen3.8-max | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261006-prompt-v4-high-opencode-opencode-minimax-m3 | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261006-prompt-v4-high-opencode-opencode-minimax-m3 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261006-prompt-v4-high-opencode-opencode-minimax-m3 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261006-prompt-v4-high-opencode-opencode-gemini-3.8-flash | Live GET /v1/account versus saved profile identity |
| webhook destination | fail | 20261006-prompt-v4-high-opencode-opencode-gemini-3.8-flash | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20261006-prompt-v4-high-opencode-opencode-gemini-3.8-flash | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261006-prompt-v4-high-opencode-opencode-grok-4.7 | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261006-prompt-v4-high-opencode-opencode-grok-4.7 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20261006-prompt-v4-high-opencode-opencode-grok-4.7 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| cross-run Prodigi receipts | unknown |  | A single order must not be linked to Stripe objects from different runs |
| cross-run Stripe objects | unknown |  | Repeated object IDs across run profiles |
| cross-run source references | pass |  | Static source contains another inspected run ID or deployment; review hits before attribution |
| Prodigi account separation | shared |  | Harness intentionally supplies one shared Prodigi sandbox credential; orders are not account-isolated |

### Artwork evidence

No artwork is reconstructed or executed automatically. Reviewed selections preserve original bytes and canvas. Pixel statistics and a matching hash alone do not establish printable quality.

| Run | Source class | Canvas | Nontransparent pixels | Bounds | Prodigi hash match |
| --- | --- | --- | --- | --- | --- |


### Review required

- Confirm payment-to-app-to-order provenance, variant/SKU mapping, artwork intent and physical print scale.
- Inspect artwork on dark and light backgrounds and compare fetched Prodigi thumbnails.
- Review source cues and capture gaps in inspection.json. No source cue is an automatic launch-blocker finding.
- Review retry/idempotency, paid-state guards, deployment environment configuration and cross-run references.
- Do not publish private snapshots, transcripts, profile files, signed source URLs or raw customer records.

Warnings: 20261006-prompt-v4-high-kimi-kimi-code-k3: no terminal transcript event; 20261006-prompt-v4-high-opencode-opencode-glm-5.3-high: no terminal transcript event; 20261006-prompt-v4-high-opencode-opencode-deepseek-v4.1-flash: no terminal transcript event; 20261006-prompt-v4-high-opencode-opencode-qwen3.8-max: no terminal transcript event; 20261006-prompt-v4-high-opencode-opencode-gemini-3.8-flash: no terminal transcript event; Runs without deployment URL could not be captured.
<!-- run-inspector:v1:end -->
