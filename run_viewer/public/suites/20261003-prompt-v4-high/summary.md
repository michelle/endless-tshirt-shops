# Prompt v4 frontier suite

Fourteen runs used the same prompt and high reasoning effort. The original thirteen-run controller completed on October 4, 2026; GPT-6 Sol was added afterward when GPT-6.1 Sol proved unavailable through Codex's ChatGPT-account route. That supplemental run used the same prompt hash but a later harness commit, so the automated isolation report correctly marks the base commit as inconsistent.

Ten of the original thirteen runs succeeded at the process level, and GPT-6 Sol also succeeded. Process success does not imply task completion: GPT-6 Sol deployed a working customizable storefront through ChatGPT Sites but left checkout disabled because it did not find payment credentials. GPT-6.1 Sol failed immediately as unavailable, while Qwen 3.8 Max and Grok 4.7 exited non-zero after producing partial work.

Deployment evidence is shown separately for what each agent reported and what the post-run harness managed to redeploy. At capture time, Astra, GPT-6 Sol, GPT-6 Luna's harness copy, and Opus's harness copy rendered their stores. Five temporary Vercel deployments had already expired. GLM reported a malformed tunnel URL, MiniMax reported the Vercel homepage, and the remaining failed or incomplete runs had no usable storefront URL.

The evidence below is automated and still requires human review. In particular, the Stripe and Prodigi observations establish linked sandbox objects for some runs, not complete proof that every customer-facing checkout path caused fulfillment correctly. No physical shirt was inspected.

<!-- run-inspector:v1:start -->
## Automated inspection evidence

Snapshot: 2026-10-04T18:44:11.851Z. Suite: `20261003-prompt-v4-high`. Artifact ref: `db1247b0013a638a109ef0457ef8fd090f5e6557`. Inspector: `1.0.0`.

This is generated evidence, not a reviewed pass/fail rating. Searches do not prove reading or training-data reliance; paid Stripe objects do not prove the customer checkout flow. Live observations are later snapshots, not historical run-time evidence.

### Run and framework evidence

| Model | Run status | Agent deployment | Harness inspection deployment | Seconds | Framework dependencies | Runtime files / lines | Verification files / lines |
| --- | --- | --- | --- | --- | --- | --- | --- |
| gpt-6-astra | succeeded | reported | failed | 564 | next@16.3.4, next-themes@^0.4.6, react@19.2.6, react-day-picker@^10.0.1, react-dom@19.2.6, react-hook-form@^7.85.0, react-resizable-panels@^4.12.2 | 94 / 9031 | 12 / 1132 |
| gpt-6.1-sol | failed | not_reported | failed | 2 |  | 0 / 0 | 0 / 0 |
| gpt-6-luna | succeeded | reported | succeeded | 700 |  | 1 / 156 | 1 / 14 |
| claude-fable-5-1 | succeeded | reported | failed | 1958 | @resvg/resvg-wasm@^2.6.2, next@^15.5.0, react@^19.1.0, react-dom@^19.1.0, stripe@^18.5.0 | 26 / 2138 | 2 / 91 |
| claude-opus-5-5 | succeeded | reported | succeeded | 1902 | @resvg/resvg-wasm@^2.6.2, stripe@^23.0.0 | 16 / 1436 | 8 / 228 |
| claude-sonnet-5-5 | succeeded | reported | failed | 1619 | next@^15.5.27, react@^19.3.0, react-dom@^19.3.0, sharp@^0.35.5, stripe@^23.0.0 | 32 / 1845 | 2 / 90 |
| kimi-code/k3 | succeeded | reported | failed | 3750 | @resvg/resvg-js@^2.6.2, stripe@^17.7.0 | 18 / 1013 | 4 / 171 |
| opencode/glm-5.3#high | succeeded | reported | failed | 3830 | @resvg/resvg-js@^2.6.2, next@16.3.8, react@19.2.8, react-dom@19.2.8, stripe@^23.0.0 | 28 / 3262 | 1 / 37 |
| opencode/deepseek-v4.1-flash | succeeded | reported | failed | 5477 | @resvg/resvg-wasm@^2.6.2, next@14.2.15, react@18.3.1, react-dom@18.3.1, stripe@^17.2.1 | 26 / 2446 | 5 / 120 |
| opencode/qwen3.8-max | failed | not_reported | failed | 1700 | stripe@^17.5.0 | 12 / 1326 | 4 / 341 |
| opencode/minimax-m3 | succeeded | reported | failed | 2613 | @resvg/resvg-js@^2.6.2, next@14.2.18, react@^18.3.1, react-dom@^18.3.1, stripe@^17.5.0 | 26 / 3231 | 0 / 0 |
| opencode/gemini-3.8-flash | succeeded | reported | failed | 1296 | @resvg/resvg-wasm@^2.6.2, next@14.2.35, react@^18, react-dom@^18, stripe@^23.0.0 | 28 / 3877 | 0 / 0 |
| opencode/grok-4.7 | failed | not_reported | failed | 4621 | @resvg/resvg-js@^2.6.2, next@^15.5.4, react@^19.1.1, react-dom@^19.1.1, stripe@^18.5.0 | 26 / 2321 | 1 / 13 |
| gpt-6-sol | succeeded | reported | failed | 664 | next@16.3.4, next-themes@^0.4.6, react@19.2.6, react-day-picker@^10.0.1, react-dom@19.2.6, react-hook-form@^7.85.0, react-resizable-panels@^4.12.2 | 89 / 9321 | 9 / 1093 |

### Documentation-use evidence

Search counts are individual query requests. Reference requests/reads count tool calls, not unique pages. A returned tool result can be an error page or snippet; it is not proof of successful document retrieval. Raw queries, commands and tool outputs remain private.

| Model | Topic | Coverage | Search queries | Document requests | Local reference calls | Reference results available |
| --- | --- | --- | --- | --- | --- | --- |
| gpt-6-astra | stripe | observed_partial | 1 | 0 | 0 | 0 |
| gpt-6-astra | prodigi | observed_partial | 4 | 1 | 1 | 1 |
| gpt-6-astra | framework | observed_partial | 0 | 0 | 0 | 0 |
| gpt-6.1-sol | stripe | unknown | unknown | unknown | unknown | unknown |
| gpt-6.1-sol | prodigi | unknown | unknown | unknown | unknown | unknown |
| gpt-6.1-sol | framework | unknown | unknown | unknown | unknown | unknown |
| gpt-6-luna | stripe | observed_partial | 2 | 0 | 0 | 0 |
| gpt-6-luna | prodigi | observed_partial | 6 | 0 | 0 | 0 |
| gpt-6-luna | framework | observed_partial | 0 | 0 | 0 | 0 |
| claude-fable-5-1 | stripe | observed_partial | 0 | 0 | 0 | 0 |
| claude-fable-5-1 | prodigi | observed_partial | 0 | 0 | 0 | 0 |
| claude-fable-5-1 | framework | observed_partial | 0 | 0 | 0 | 0 |
| claude-opus-5-5 | stripe | observed_partial | 0 | 0 | 0 | 0 |
| claude-opus-5-5 | prodigi | observed_partial | 0 | 1 | 0 | 1 |
| claude-opus-5-5 | framework | observed_partial | 0 | 0 | 0 | 0 |
| claude-sonnet-5-5 | stripe | observed_partial | 0 | 0 | 0 | 0 |
| claude-sonnet-5-5 | prodigi | observed_partial | 0 | 1 | 0 | 1 |
| claude-sonnet-5-5 | framework | observed_partial | 0 | 0 | 1 | 1 |
| kimi-code/k3 | stripe | observed_partial | 0 | 0 | 0 | 0 |
| kimi-code/k3 | prodigi | observed_partial | 0 | 0 | 0 | 0 |
| kimi-code/k3 | framework | observed_partial | 0 | 0 | 0 | 0 |
| opencode/glm-5.3#high | stripe | observed_partial | 2 | 0 | 1 | 1 |
| opencode/glm-5.3#high | prodigi | observed_partial | 2 | 5 | 0 | 5 |
| opencode/glm-5.3#high | framework | observed_partial | 0 | 0 | 8 | 8 |
| opencode/deepseek-v4.1-flash | stripe | observed_partial | 0 | 0 | 0 | 0 |
| opencode/deepseek-v4.1-flash | prodigi | observed_partial | 2 | 2 | 0 | 2 |
| opencode/deepseek-v4.1-flash | framework | observed_partial | 1 | 0 | 0 | 0 |
| opencode/qwen3.8-max | stripe | observed_partial | 0 | 1 | 0 | 1 |
| opencode/qwen3.8-max | prodigi | observed_partial | 1 | 2 | 0 | 1 |
| opencode/qwen3.8-max | framework | observed_partial | 0 | 0 | 0 | 0 |
| opencode/minimax-m3 | stripe | observed_partial | 0 | 0 | 0 | 0 |
| opencode/minimax-m3 | prodigi | observed_partial | 2 | 10 | 0 | 7 |
| opencode/minimax-m3 | framework | observed_partial | 0 | 0 | 0 | 0 |
| opencode/gemini-3.8-flash | stripe | observed_partial | 0 | 0 | 0 | 0 |
| opencode/gemini-3.8-flash | prodigi | observed_partial | 0 | 0 | 0 | 0 |
| opencode/gemini-3.8-flash | framework | observed_partial | 0 | 0 | 0 | 0 |
| opencode/grok-4.7 | stripe | observed_partial | 0 | 0 | 0 | 0 |
| opencode/grok-4.7 | prodigi | observed_partial | 2 | 2 | 0 | 2 |
| opencode/grok-4.7 | framework | observed_partial | 0 | 0 | 0 | 0 |
| gpt-6-sol | stripe | observed_partial | 5 | 0 | 0 | 0 |
| gpt-6-sol | prodigi | observed_partial | 5 | 0 | 0 | 0 |
| gpt-6-sol | framework | observed_partial | 0 | 0 | 0 | 0 |

### Payment and fulfillment observations

| Model | Stripe evidence | Sessions / paid | PaymentIntents / succeeded | Linked Prodigi orders |
| --- | --- | --- | --- | --- |
| gpt-6-astra | No test key in saved profile | unknown | unknown | None observed; check coverage |
| gpt-6.1-sol | No test key in saved profile | unknown | unknown | None observed; check coverage |
| gpt-6-luna | No test key in saved profile | unknown | unknown | None observed; check coverage |
| claude-fable-5-1 | Lists complete | 3 / 2 | 2 / 2 | ord_1176885: paid-stripe-object-linked; ord_1176884: paid-stripe-object-linked |
| claude-opus-5-5 | Lists complete | 9 / 5 | 5 / 5 | ord_1176901: paid-stripe-object-linked; ord_1176900: paid-stripe-object-linked; ord_1176887: paid-stripe-object-linked |
| claude-sonnet-5-5 | Lists complete | 8 / 1 | 1 / 1 | ord_1176916: paid-stripe-object-linked |
| kimi-code/k3 | Lists complete | 23 / 4 | 4 / 4 | ord_1176930: paid-stripe-object-linked; ord_1176929: paid-stripe-object-linked |
| opencode/glm-5.3#high | No test key in saved profile | unknown | unknown | None observed; check coverage |
| opencode/deepseek-v4.1-flash | No test key in saved profile | unknown | unknown | None observed; check coverage |
| opencode/qwen3.8-max | Lists complete | 4 / 0 | 0 / 0 | None observed; check coverage |
| opencode/minimax-m3 | No test key in saved profile | unknown | unknown | None observed; check coverage |
| opencode/gemini-3.8-flash | Lists complete | 3 / 0 | 2 / 2 | None observed; check coverage |
| opencode/grok-4.7 | Lists complete | 1 / 0 | 0 / 0 | None observed; check coverage |
| gpt-6-sol | No test key in saved profile | unknown | unknown | None observed; check coverage |

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
| consistent base_commit | fail |  | Compare immutable run metadata |
| consistent reasoning_effort | pass |  | Compare immutable run metadata |
| profile/account agreement | unknown | 20261003-prompt-v4-high-codex-gpt-6-astra | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261003-prompt-v4-high-codex-gpt-6-astra | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261003-prompt-v4-high-codex-gpt-6-astra | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261003-prompt-v4-high-codex-gpt-6.1-sol | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261003-prompt-v4-high-codex-gpt-6.1-sol | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261003-prompt-v4-high-codex-gpt-6.1-sol | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261003-prompt-v4-high-codex-gpt-6-luna | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261003-prompt-v4-high-codex-gpt-6-luna | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261003-prompt-v4-high-codex-gpt-6-luna | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261003-prompt-v4-high-claude-claude-fable-5-1 | Live GET /v1/account versus saved profile identity |
| webhook destination | pass | 20261003-prompt-v4-high-claude-claude-fable-5-1 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20261003-prompt-v4-high-claude-claude-fable-5-1 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261003-prompt-v4-high-claude-claude-opus-5-5 | Live GET /v1/account versus saved profile identity |
| webhook destination | fail | 20261003-prompt-v4-high-claude-claude-opus-5-5 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20261003-prompt-v4-high-claude-claude-opus-5-5 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261003-prompt-v4-high-claude-claude-sonnet-5-5 | Live GET /v1/account versus saved profile identity |
| webhook destination | pass | 20261003-prompt-v4-high-claude-claude-sonnet-5-5 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20261003-prompt-v4-high-claude-claude-sonnet-5-5 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261003-prompt-v4-high-kimi-kimi-code-k3 | Live GET /v1/account versus saved profile identity |
| webhook destination | pass | 20261003-prompt-v4-high-kimi-kimi-code-k3 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20261003-prompt-v4-high-kimi-kimi-code-k3 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261003-prompt-v4-high-opencode-opencode-glm-5.3-high | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261003-prompt-v4-high-opencode-opencode-glm-5.3-high | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261003-prompt-v4-high-opencode-opencode-glm-5.3-high | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261003-prompt-v4-high-opencode-opencode-deepseek-v4.1-flash | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261003-prompt-v4-high-opencode-opencode-deepseek-v4.1-flash | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261003-prompt-v4-high-opencode-opencode-deepseek-v4.1-flash | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261003-prompt-v4-high-opencode-opencode-qwen3.8-max | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261003-prompt-v4-high-opencode-opencode-qwen3.8-max | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20261003-prompt-v4-high-opencode-opencode-qwen3.8-max | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261003-prompt-v4-high-opencode-opencode-minimax-m3 | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261003-prompt-v4-high-opencode-opencode-minimax-m3 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261003-prompt-v4-high-opencode-opencode-minimax-m3 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261003-prompt-v4-high-opencode-opencode-gemini-3.8-flash | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261003-prompt-v4-high-opencode-opencode-gemini-3.8-flash | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20261003-prompt-v4-high-opencode-opencode-gemini-3.8-flash | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261003-prompt-v4-high-opencode-opencode-grok-4.7 | Live GET /v1/account versus saved profile identity |
| webhook destination | fail | 20261003-prompt-v4-high-opencode-opencode-grok-4.7 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20261003-prompt-v4-high-opencode-opencode-grok-4.7 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20261003-prompt-v4-high-codex-gpt-6-sol | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20261003-prompt-v4-high-codex-gpt-6-sol | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20261003-prompt-v4-high-codex-gpt-6-sol | Objects older than run start (60s tolerance) suggest pre-existing account state |
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

Warnings: 20261003-prompt-v4-high-kimi-kimi-code-k3: no terminal transcript event; 20261003-prompt-v4-high-opencode-opencode-glm-5.3-high: no terminal transcript event; 20261003-prompt-v4-high-opencode-opencode-deepseek-v4.1-flash: no terminal transcript event; 20261003-prompt-v4-high-opencode-opencode-minimax-m3: no terminal transcript event; 20261003-prompt-v4-high-opencode-opencode-gemini-3.8-flash: no terminal transcript event.
<!-- run-inspector:v1:end -->
