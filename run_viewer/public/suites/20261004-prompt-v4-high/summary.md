# Prompt v4 clean-workspace frontier suite

[Open the suite charts](https://michelle.github.io/endless-tshirt-shops/suites/20261004-prompt-v4-high/charts/)

Fourteen runs used the same prompt, base commit, clean per-run workspace, and high reasoning effort. Eleven completed normally. GLM 5.3 High stopped after requesting interactive guidance that the noninteractive harness could not provide, and Grok 4.7 stopped during implementation.

Kimi K3 is treated as a completed run in this viewer. It produced a finished storefront, a final report, and a working durable inspection deployment before the deadline. Its archived process status remains `timed_out` because long-lived server and Cloudflare Tunnel children kept the capture process open until the harness terminated it roughly seventeen minutes after the final answer. The automated table below preserves that raw process-level status.

Deployment evidence distinguishes the URL reported by each agent from the durable inspection deployment retained by the harness. At recapture time, eleven storefronts had a healthy durable deployment: the four ChatGPT Sites deployments were reused directly, and the remaining healthy copies were hosted on Vercel. DeepSeek's copy reached the browser but crashed during client initialization; GLM and Grok produced no usable storefront.

The evidence below is automated and still requires human review. Stripe and Prodigi observations establish linked sandbox objects for some runs, not proof that every customer-facing checkout path was correct. No physical shirt was inspected.

<!-- run-inspector:v1:start -->
## Automated inspection evidence

Snapshot: 2026-10-05T12:47:24.838Z. Suite: `20261004-prompt-v4-high`. Artifact ref: `3994bf75b45c4ea26b2bb8dafc34d28371e65bbd`. Inspector: `1.0.0`.

This is generated evidence, not a reviewed pass/fail rating. Searches do not prove reading or training-data reliance; paid Stripe objects do not prove the customer checkout flow. Live observations are later snapshots, not historical run-time evidence.

### Run and framework evidence

| Model | Run status | Agent deployment | Harness inspection deployment | Seconds | Framework dependencies | Runtime files / lines | Verification files / lines |
| --- | --- | --- | --- | --- | --- | --- | --- |
| gpt-6-astra | succeeded | reported | succeeded | 657 | next@16.3.4, next-themes@^0.4.6, react@19.2.6, react-day-picker@^10.0.1, react-dom@19.2.6, react-hook-form@^7.85.0, react-resizable-panels@^4.12.2 | 90 / 9207 | 11 / 1128 |
| gpt-6-sol | succeeded | reported | succeeded | 848 | next@16.3.4, next-themes@^0.4.6, react@19.2.6, react-day-picker@^10.0.1, react-dom@19.2.6, react-hook-form@^7.85.0, react-resizable-panels@^4.12.2 | 92 / 9093 | 9 / 1093 |
| gpt-6-luna | succeeded | reported | succeeded | 845 | next@16.3.4, next-themes@^0.4.6, react@19.2.6, react-day-picker@^10.0.1, react-dom@19.2.6, react-hook-form@^7.85.0, react-resizable-panels@^4.12.2 | 92 / 9345 | 9 / 1093 |
| claude-fable-5-1 | succeeded | reported | succeeded | 1925 | @resvg/resvg-js@^2.6.2, next@16.3.8, react@19.2.8, react-dom@19.2.8, stripe@^23.0.0 | 23 / 1424 | 1 / 91 |
| claude-opus-5-5 | succeeded | reported | succeeded | 1872 | @resvg/resvg-wasm@^2.6.2, next@^16.3.8, react@^19.3.0, react-dom@^19.3.0, stripe@^23.0.0 | 25 / 2026 | 2 / 31 |
| claude-sonnet-5-5 | succeeded | reported | succeeded | 1023 | @resvg/resvg-js@^2.6.2, stripe@^23.0.0 | 17 / 1820 | 2 / 314 |
| kimi-code/k3 | timed_out | reported | succeeded | 7200 | sharp@^0.34.4 | 13 / 1600 | 3 / 114 |
| opencode/glm-5.3#high | failed | not_reported | failed | 421 |  | 0 / 0 | 0 / 0 |
| opencode/deepseek-v4.1-flash | succeeded | reported | failed | 5485 | @resvg/resvg-wasm@2.6.2, next@15.5.27, react@19.1.0, react-dom@19.1.0, stripe@18.4.0 | 21 / 2155 | 1 / 54 |
| opencode/qwen3.8-max | succeeded | not_reported | succeeded | 1592 | stripe@^23.0.0 | 11 / 2321 | 2 / 374 |
| opencode/minimax-m3 | succeeded | reported | succeeded | 1177 | @resvg/resvg-js@^2.6.2, stripe@^23.0.0 | 8 / 2215 | 0 / 0 |
| opencode/gemini-3.8-flash | succeeded | reported | succeeded | 772 | @resvg/resvg-js@^2.6.2, stripe@^23.0.0 | 8 / 2531 | 0 / 0 |
| opencode/grok-4.7 | failed | not_reported | failed | 4681 | next@^15.1.0, react@^19.0.0, react-dom@^19.0.0, sharp@^0.33.5, stripe@^17.7.0 | 21 / 1667 | 1 / 89 |
| gpt-6.1-sol | succeeded | reported | succeeded | 742 |  | 8 / 128 | 1 / 16 |

### Documentation-use evidence

Search counts are individual query requests. Reference requests/reads count tool calls, not unique pages. A returned tool result can be an error page or snippet; it is not proof of successful document retrieval. Raw queries, commands and tool outputs remain private.

| Model | Topic | Coverage | Search queries | Document requests | Local reference calls | Reference results available |
| --- | --- | --- | --- | --- | --- | --- |
| gpt-6-astra | stripe | observed_partial | 1 | 0 | 0 | 0 |
| gpt-6-astra | prodigi | observed_partial | 2 | 1 | 0 | 0 |
| gpt-6-astra | framework | observed_partial | 0 | 0 | 0 | 0 |
| gpt-6-sol | stripe | observed_partial | 5 | 0 | 0 | 0 |
| gpt-6-sol | prodigi | observed_partial | 8 | 0 | 0 | 0 |
| gpt-6-sol | framework | observed_partial | 0 | 0 | 0 | 0 |
| gpt-6-luna | stripe | observed_partial | 2 | 0 | 0 | 0 |
| gpt-6-luna | prodigi | observed_partial | 6 | 4 | 0 | 3 |
| gpt-6-luna | framework | observed_partial | 0 | 0 | 1 | 1 |
| claude-fable-5-1 | stripe | observed_partial | 1 | 0 | 0 | 0 |
| claude-fable-5-1 | prodigi | observed_partial | 0 | 0 | 0 | 0 |
| claude-fable-5-1 | framework | observed_partial | 0 | 0 | 0 | 0 |
| claude-opus-5-5 | stripe | observed_partial | 1 | 1 | 3 | 4 |
| claude-opus-5-5 | prodigi | observed_partial | 0 | 0 | 0 | 0 |
| claude-opus-5-5 | framework | observed_partial | 0 | 0 | 0 | 0 |
| claude-sonnet-5-5 | stripe | observed_partial | 0 | 0 | 0 | 0 |
| claude-sonnet-5-5 | prodigi | observed_partial | 0 | 0 | 0 | 0 |
| claude-sonnet-5-5 | framework | observed_partial | 0 | 0 | 0 | 0 |
| kimi-code/k3 | stripe | observed_partial | 0 | 0 | 0 | 0 |
| kimi-code/k3 | prodigi | observed_partial | 0 | 1 | 0 | 1 |
| kimi-code/k3 | framework | observed_partial | 0 | 0 | 0 | 0 |
| opencode/glm-5.3#high | stripe | observed_partial | 0 | 0 | 0 | 0 |
| opencode/glm-5.3#high | prodigi | observed_partial | 0 | 3 | 0 | 3 |
| opencode/glm-5.3#high | framework | observed_partial | 0 | 0 | 0 | 0 |
| opencode/deepseek-v4.1-flash | stripe | observed_partial | 0 | 0 | 0 | 0 |
| opencode/deepseek-v4.1-flash | prodigi | observed_partial | 0 | 2 | 0 | 2 |
| opencode/deepseek-v4.1-flash | framework | observed_partial | 0 | 0 | 0 | 0 |
| opencode/qwen3.8-max | stripe | observed_partial | 0 | 0 | 0 | 0 |
| opencode/qwen3.8-max | prodigi | observed_partial | 0 | 5 | 0 | 5 |
| opencode/qwen3.8-max | framework | observed_partial | 0 | 0 | 0 | 0 |
| opencode/minimax-m3 | stripe | observed_partial | 0 | 1 | 0 | 1 |
| opencode/minimax-m3 | prodigi | observed_partial | 1 | 6 | 0 | 6 |
| opencode/minimax-m3 | framework | observed_partial | 0 | 0 | 0 | 0 |
| opencode/gemini-3.8-flash | stripe | observed_partial | 0 | 0 | 0 | 0 |
| opencode/gemini-3.8-flash | prodigi | observed_partial | 0 | 0 | 0 | 0 |
| opencode/gemini-3.8-flash | framework | observed_partial | 0 | 0 | 0 | 0 |
| opencode/grok-4.7 | stripe | observed_partial | 1 | 0 | 0 | 0 |
| opencode/grok-4.7 | prodigi | observed_partial | 4 | 2 | 0 | 2 |
| opencode/grok-4.7 | framework | observed_partial | 0 | 0 | 0 | 0 |
| gpt-6.1-sol | stripe | observed_partial | 4 | 2 | 0 | 0 |
| gpt-6.1-sol | prodigi | observed_partial | 2 | 0 | 0 | 0 |
| gpt-6.1-sol | framework | observed_partial | 0 | 0 | 0 | 0 |

### Payment and fulfillment observations

| Model | Stripe evidence | Sessions / paid | PaymentIntents / succeeded | Linked Prodigi orders |
| --- | --- | --- | --- | --- |
| gpt-6-astra | No test key in saved profile | unknown | unknown | None observed; check coverage |
| gpt-6-sol | No test key in saved profile | unknown | unknown | None observed; check coverage |
| gpt-6-luna | No test key in saved profile | unknown | unknown | None observed; check coverage |
| claude-fable-5-1 | Lists complete | 8 / 2 | 2 / 2 | ord_1177218: paid-stripe-object-linked; ord_1177213: paid-stripe-object-linked |
| claude-opus-5-5 | No test key in saved profile | unknown | unknown | None observed; check coverage |
| claude-sonnet-5-5 | No test key in saved profile | unknown | unknown | None observed; check coverage |
| kimi-code/k3 | No test key in saved profile | unknown | unknown | None observed; check coverage |
| opencode/glm-5.3#high | No test key in saved profile | unknown | unknown | None observed; check coverage |
| opencode/deepseek-v4.1-flash | Lists complete | 8 / 6 | 6 / 6 | ord_1177340: paid-stripe-object-linked; ord_1177339: paid-stripe-object-linked; ord_1177336: paid-stripe-object-linked; ord_1177334: paid-stripe-object-linked; ord_1177333: paid-stripe-object-linked; ord_1177332: paid-stripe-object-linked |
| opencode/qwen3.8-max | No test key in saved profile | unknown | unknown | None observed; check coverage |
| opencode/minimax-m3 | No test key in saved profile | unknown | unknown | None observed; check coverage |
| opencode/gemini-3.8-flash | Lists complete | 3 / 0 | 2 / 2 | ord_1177360: paid-stripe-object-linked |
| opencode/grok-4.7 | No test key in saved profile | unknown | unknown | None observed; check coverage |
| gpt-6.1-sol | No test key in saved profile | unknown | unknown | None observed; check coverage |

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
| profile/account agreement | unknown | 20261004-prompt-v4-high-codex-gpt-6-astra | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261004-prompt-v4-high-codex-gpt-6-astra | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261004-prompt-v4-high-codex-gpt-6-astra | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261004-prompt-v4-high-codex-gpt-6-sol | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261004-prompt-v4-high-codex-gpt-6-sol | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261004-prompt-v4-high-codex-gpt-6-sol | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261004-prompt-v4-high-codex-gpt-6-luna | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261004-prompt-v4-high-codex-gpt-6-luna | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261004-prompt-v4-high-codex-gpt-6-luna | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261004-prompt-v4-high-claude-claude-fable-5-1 | Live GET /v1/account versus saved profile identity |
| webhook destination | fail | 20261004-prompt-v4-high-claude-claude-fable-5-1 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20261004-prompt-v4-high-claude-claude-fable-5-1 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261004-prompt-v4-high-claude-claude-opus-5-5 | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261004-prompt-v4-high-claude-claude-opus-5-5 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261004-prompt-v4-high-claude-claude-opus-5-5 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261004-prompt-v4-high-claude-claude-sonnet-5-5 | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261004-prompt-v4-high-claude-claude-sonnet-5-5 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261004-prompt-v4-high-claude-claude-sonnet-5-5 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261004-prompt-v4-high-kimi-kimi-code-k3 | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261004-prompt-v4-high-kimi-kimi-code-k3 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261004-prompt-v4-high-kimi-kimi-code-k3 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261004-prompt-v4-high-opencode-opencode-glm-5.3-high | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261004-prompt-v4-high-opencode-opencode-glm-5.3-high | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261004-prompt-v4-high-opencode-opencode-glm-5.3-high | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261004-prompt-v4-high-opencode-opencode-deepseek-v4.1-flash | Live GET /v1/account versus saved profile identity |
| webhook destination | pass | 20261004-prompt-v4-high-opencode-opencode-deepseek-v4.1-flash | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20261004-prompt-v4-high-opencode-opencode-deepseek-v4.1-flash | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261004-prompt-v4-high-opencode-opencode-qwen3.8-max | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261004-prompt-v4-high-opencode-opencode-qwen3.8-max | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261004-prompt-v4-high-opencode-opencode-qwen3.8-max | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261004-prompt-v4-high-opencode-opencode-minimax-m3 | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261004-prompt-v4-high-opencode-opencode-minimax-m3 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261004-prompt-v4-high-opencode-opencode-minimax-m3 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261004-prompt-v4-high-opencode-opencode-gemini-3.8-flash | Live GET /v1/account versus saved profile identity |
| webhook destination | fail | 20261004-prompt-v4-high-opencode-opencode-gemini-3.8-flash | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20261004-prompt-v4-high-opencode-opencode-gemini-3.8-flash | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261004-prompt-v4-high-opencode-opencode-grok-4.7 | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261004-prompt-v4-high-opencode-opencode-grok-4.7 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261004-prompt-v4-high-opencode-opencode-grok-4.7 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261004-prompt-v4-high-codex-gpt-6.1-sol | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261004-prompt-v4-high-codex-gpt-6.1-sol | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261004-prompt-v4-high-codex-gpt-6.1-sol | Objects older than run start (60s tolerance) suggest pre-existing account state |
| cross-run Prodigi receipts | unknown |  | A single order must not be linked to Stripe objects from different runs |
| cross-run Stripe objects | unknown |  | Repeated object IDs across run profiles |
| cross-run source references | pass |  | Static source contains another inspected run ID or deployment; review hits before attribution |
| Prodigi account separation | shared |  | Harness intentionally supplies one shared Prodigi sandbox credential; orders are not account-isolated |
| source coverage | unknown |  | Some artifacts were excluded or runtime files unavailable |

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

Warnings: 20261004-prompt-v4-high-kimi-kimi-code-k3: no terminal transcript event; 20261004-prompt-v4-high-opencode-opencode-deepseek-v4.1-flash: no terminal transcript event; 20261004-prompt-v4-high-opencode-opencode-qwen3.8-max: no terminal transcript event; 20261004-prompt-v4-high-opencode-opencode-minimax-m3: no terminal transcript event; 20261004-prompt-v4-high-opencode-opencode-gemini-3.8-flash: no terminal transcript event.
<!-- run-inspector:v1:end -->
