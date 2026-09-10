# Prompt v3 — seven-model high-reasoning run

All seven model slots completed successfully against the same pinned Prompt v3 bytes, base commit, high reasoning setting, and disabled adapter memory. Each result is archived as an immutable commit on `benchmark-results`.

## Reviewed outcome

| Model | Store concept | Result | Payment / fulfillment evidence |
| --- | --- | --- | --- |
| gpt-6-astra | Personal Best | Deployed; payment blocked | No Stripe test key and no paid or attributable Prodigi order |
| gpt-5.6-sol | Signal / Self | Deployed; payment blocked | No Stripe test key and no paid or attributable Prodigi order |
| gpt-5.6-terra | Futurefolk | Direct Prodigi asset; checkout unpaid | Two unpaid Sessions; a separate direct sandbox order completed with an exact-hash asset but bypassed payment |
| gpt-5.6-luna | Orbital Post | Deployed; payment blocked | No Stripe test key and no paid or attributable Prodigi order |
| claude-fable-5-1 | Heartwood | Paid E2E with reliability warning | Two paid Sessions linked to orders; one selected asset completed and an earlier linked asset failed |
| claude-opus-5 | Flora Personalis | Paid E2E | Two paid Sessions linked to two completed assets |
| claude-sonnet-5 | Constella | Paid E2E | One paid PaymentIntent linked to a completed asset |

All seven deployments returned HTTP 200 during the 2026-09-10 capture. Astra, Terra, and Luna use exact live default-design captures because no paid customer asset was available. Sol's archive is the customer-facing shirt mockup, not an isolated print master. Fable and Opus use exact paid-order sources. Sonnet's paid source was recovered from its signed blob URL and independently matched to Prodigi's recorded MD5; the design itself visibly contains `E2E Test` and `AUTOMATED RUN`, so it is test evidence rather than launch-ready merchandise.

## Artwork and fulfillment audit

- Astra: the original staged file was only a blank shirt mockup, so the viewer uses the actual default Joshua Tree print-detail image captured from the deployed customizer. Source tests exercise a separate high-resolution renderer, but neither payment nor fulfillment was observed.
- Sol: the reviewed `MAKE ROOM FOR WONDER` customer mockup is coherent, but it includes the shirt and background and therefore does not prove the print source sent to a fulfiller.
- Terra: the viewer's main design is the exact 2490×3510 live default print route. `submitted.png` separately preserves the exact MD5-matched asset from direct sandbox order `ord_1171331` for black/M Bella + Canvas 3003. That direct order validates API delivery only; it did not originate from a paid checkout.
- Luna: the archived default Orbital Post design is a direct high-density capture of the live customer artwork. A separate 4200×5370 renderer exists in source, but no paid order archived or submitted it.
- Fable: paid order `ord_1171350` used the archived 4665×5844 transparent Heartwood source, with an exact MD5 match, for black/M Gildan 64000; its asset completed. Earlier paid-linked order `ord_1171347` failed because its asset URL pointed to localhost.
- Opus: paid-linked orders `ord_1171364` and `ord_1171365` both had complete assets. The viewer preserves the exact MD5-matched 4665×5844 transparent source from selected maroon/L Gildan 64000 order `ord_1171365`; the snapshot still labeled the order in progress.
- Sonnet: paid-linked order `ord_1171370` had a complete black/M Gildan 64000 asset. The archived 2100×2625 transparent source was manually verified against Prodigi's MD5 because the inspector could not fetch its blob host directly.

## Audit limits and publication notes

Overall isolation remains `unknown`: run IDs, project names, deployment origins, profile paths, prompt hash, base commit, and reasoning effort were consistent, but several Stripe identities were unavailable and the Prodigi sandbox is intentionally shared. Paid objects establish provider state, while the source, webhook path, order linkage, and exact asset hashes provide the stronger application-path attribution described above. Physical garments were not sampled, so print scale, placement, color, and fabric behavior remain unverified.

Astra's published artifact records an `artifact_recovery`: provider-shaped dummy Stripe values were mechanically renamed during recovery so the mandatory publication scan could pass. That did not change implementation behavior or rerun the model. Private snapshots, credentials, signed source URLs, and customer records are excluded from this viewer archive.

## Production handoff

Opus has the strongest observed commerce path in this suite. Fable also completes paid fulfillment but needs the localhost asset failure fixed and retry behavior verified. Sonnet completes the paid path, but the selected test-labeled artwork should be replaced and physically sampled. Astra, Sol, Terra, and Luna still require genuine Stripe test payments through the deployed applications and exact payment-linked Prodigi assets before their commerce claims can pass. Every store still needs live credentials, tax and shipping validation, durable fulfillment state, customer communications, monitoring, refund handling, and physical samples.

<!-- run-inspector:v1:start -->
## Automated inspection evidence

Snapshot: 2026-09-10T19:25:53.818Z. Suite: `20260910-prompt-v3-high`. Artifact ref: `832dc1c68ca9c025553e668178bf550c75cf9098`. Inspector: `1.0.0`.

This is generated evidence, not a reviewed pass/fail rating. Searches do not prove reading or training-data reliance; paid Stripe objects do not prove the customer checkout flow. Live observations are later snapshots, not historical run-time evidence.

### Run and framework evidence

| Model | Run status | Seconds | Framework dependencies | Runtime files / lines | Verification files / lines |
| --- | --- | --- | --- | --- | --- |
| gpt-6-astra | succeeded | 644 | react@^19.1.0, react-dom@^19.1.0, sharp@^0.35.4, stripe@^22.6.2 | 7 / 126 | 3 / 42 |
| gpt-5.6-sol | succeeded | 928 | @resvg/resvg-js@^2.6.2, next@16.3.4, react@19.2.8, react-dom@19.2.8, stripe@^22.6.2 | 16 / 724 | 0 / 0 |
| gpt-5.6-terra | succeeded | 582 | next@^16.3.4, react@19.0.0, react-dom@19.0.0, stripe@17.7.0 | 10 / 174 | 0 / 0 |
| gpt-5.6-luna | succeeded | 562 | next@^16.3.4, react@^18.3.1, react-dom@^18.3.1, sharp@^0.35.4, stripe@^16.2.0 | 10 / 285 | 0 / 0 |
| claude-fable-5-1 | succeeded | 1504 | @resvg/resvg-js@^2.6.2, next@16.3.4, react@19.2.8, react-dom@19.2.8, stripe@^22.6.2 | 21 / 1955 | 1 / 33 |
| claude-opus-5 | succeeded | 3041 | @resvg/resvg-js@2.6.2, next@^15.5.25, react@19.1.0, react-dom@19.1.0, stripe@18.5.0 | 36 / 4099 | 0 / 0 |
| claude-sonnet-5 | succeeded | 1615 | next@16.3.4, react@19.2.8, react-dom@19.2.8, stripe@^22.6.2 | 28 / 1827 | 0 / 0 |

### Documentation-use evidence

Search counts are individual query requests. Reference requests/reads count tool calls, not unique pages. A returned tool result can be an error page or snippet; it is not proof of successful document retrieval. Raw queries, commands and tool outputs remain private.

| Model | Topic | Coverage | Search queries | Document requests | Local reference calls | Reference results available |
| --- | --- | --- | --- | --- | --- | --- |
| gpt-6-astra | stripe | observed_partial | 1 | 1 | 0 | 0 |
| gpt-6-astra | prodigi | observed_partial | 2 | 2 | 0 | 1 |
| gpt-6-astra | framework | observed_partial | 0 | 1 | 0 | 0 |
| gpt-5.6-sol | stripe | observed_partial | 1 | 0 | 1 | 1 |
| gpt-5.6-sol | prodigi | observed_partial | 7 | 0 | 1 | 1 |
| gpt-5.6-sol | framework | observed_partial | 0 | 0 | 0 | 0 |
| gpt-5.6-terra | stripe | observed_partial | 0 | 0 | 0 | 0 |
| gpt-5.6-terra | prodigi | observed_partial | 6 | 0 | 0 | 0 |
| gpt-5.6-terra | framework | observed_partial | 0 | 0 | 0 | 0 |
| gpt-5.6-luna | stripe | observed_partial | 1 | 0 | 0 | 0 |
| gpt-5.6-luna | prodigi | observed_partial | 6 | 0 | 0 | 0 |
| gpt-5.6-luna | framework | observed_partial | 0 | 0 | 0 | 0 |
| claude-fable-5-1 | stripe | observed_partial | 0 | 0 | 3 | 3 |
| claude-fable-5-1 | prodigi | observed_partial | 0 | 0 | 0 | 0 |
| claude-fable-5-1 | framework | observed_partial | 0 | 0 | 6 | 6 |
| claude-opus-5 | stripe | observed_partial | 0 | 0 | 0 | 0 |
| claude-opus-5 | prodigi | observed_partial | 0 | 1 | 0 | 1 |
| claude-opus-5 | framework | observed_partial | 0 | 0 | 0 | 0 |
| claude-sonnet-5 | stripe | observed_partial | 0 | 1 | 0 | 1 |
| claude-sonnet-5 | prodigi | observed_partial | 0 | 5 | 0 | 5 |
| claude-sonnet-5 | framework | observed_partial | 0 | 0 | 0 | 0 |

### Payment and fulfillment observations

| Model | Stripe evidence | Sessions / paid | PaymentIntents / succeeded | Linked Prodigi orders |
| --- | --- | --- | --- | --- |
| gpt-6-astra | No test key in saved profile | unknown | unknown | None observed; check coverage |
| gpt-5.6-sol | No test key in saved profile | unknown | unknown | None observed; check coverage |
| gpt-5.6-terra | Lists complete | 2 / 0 | 0 / 0 | None observed; check coverage |
| gpt-5.6-luna | No test key in saved profile | unknown | unknown | None observed; check coverage |
| claude-fable-5-1 | Lists complete | 4 / 2 | 2 / 2 | ord_1171350: paid-stripe-object-linked; ord_1171347: paid-stripe-object-linked |
| claude-opus-5 | Lists complete | 7 / 2 | 2 / 2 | ord_1171365: paid-stripe-object-linked; ord_1171364: paid-stripe-object-linked |
| claude-sonnet-5 | Lists complete | 6 / 1 | 1 / 1 | ord_1171370: paid-stripe-object-linked |

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
| profile/account agreement | unknown | 20260910-prompt-v3-high-codex-gpt-6-astra | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260910-prompt-v3-high-codex-gpt-6-astra | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260910-prompt-v3-high-codex-gpt-6-astra | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260910-prompt-v3-high-codex-gpt-5.6-sol | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260910-prompt-v3-high-codex-gpt-5.6-sol | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260910-prompt-v3-high-codex-gpt-5.6-sol | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260910-prompt-v3-high-codex-gpt-5.6-terra | Live GET /v1/account versus saved profile identity |
| webhook destination | pass | 20260910-prompt-v3-high-codex-gpt-5.6-terra | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20260910-prompt-v3-high-codex-gpt-5.6-terra | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260910-prompt-v3-high-codex-gpt-5.6-luna | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260910-prompt-v3-high-codex-gpt-5.6-luna | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260910-prompt-v3-high-codex-gpt-5.6-luna | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260910-prompt-v3-high-claude-claude-fable-5-1 | Live GET /v1/account versus saved profile identity |
| webhook destination | pass | 20260910-prompt-v3-high-claude-claude-fable-5-1 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20260910-prompt-v3-high-claude-claude-fable-5-1 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260910-prompt-v3-high-claude-claude-opus-5 | Live GET /v1/account versus saved profile identity |
| webhook destination | pass | 20260910-prompt-v3-high-claude-claude-opus-5 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20260910-prompt-v3-high-claude-claude-opus-5 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260910-prompt-v3-high-claude-claude-sonnet-5 | Live GET /v1/account versus saved profile identity |
| webhook destination | pass | 20260910-prompt-v3-high-claude-claude-sonnet-5 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20260910-prompt-v3-high-claude-claude-sonnet-5 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| cross-run Prodigi receipts | unknown |  | A single order must not be linked to Stripe objects from different runs |
| cross-run Stripe objects | unknown |  | Repeated object IDs across run profiles |
| cross-run source references | pass |  | Static source contains another inspected run ID or deployment; review hits before attribution |
| Prodigi account separation | shared |  | Harness intentionally supplies one shared Prodigi sandbox credential; orders are not account-isolated |

### Artwork evidence

No artwork is reconstructed or executed automatically. Reviewed selections preserve original bytes and canvas. Pixel statistics and a matching hash alone do not establish printable quality.

| Run | Source class | Canvas | Nontransparent pixels | Bounds | Prodigi hash match |
| --- | --- | --- | --- | --- | --- |
| 20260910-prompt-v3-high-codex-gpt-6-astra | local | 1116×1402 | 1564632 | [0,0,1116,1402] | not available |
| 20260910-prompt-v3-high-codex-gpt-5.6-sol | local | 1122×1402 | 1573044 | [0,0,1122,1402] | not available |
| 20260910-prompt-v3-high-codex-gpt-5.6-terra | local | 2490×3510 | 8739900 | [0,0,2490,3510] | not available |
| 20260910-prompt-v3-high-codex-gpt-5.6-luna | local | 990×1266 | 1253340 | [0,0,990,1266] | not available |
| 20260910-prompt-v3-high-claude-claude-fable-5-1 | paid-order | 4665×5844 | 3861718 | [904,579,3405,3254] | true |
| 20260910-prompt-v3-high-claude-claude-opus-5 | paid-order | 4665×5844 | 2986480 | [531,307,4134,5101] | true |
| 20260910-prompt-v3-high-claude-claude-sonnet-5 | local | 2100×2625 | 427991 | [0,197,2017,2180] | not available |

### Review required

- Confirm payment-to-app-to-order provenance, variant/SKU mapping, artwork intent and physical print scale.
- Inspect artwork on dark and light backgrounds and compare fetched Prodigi thumbnails.
- Review source cues and capture gaps in inspection.json. No source cue is an automatic launch-blocker finding.
- Review retry/idempotency, paid-state guards, deployment environment configuration and cross-run references.
- Do not publish private snapshots, transcripts, profile files, signed source URLs or raw customer records.
<!-- run-inspector:v1:end -->
