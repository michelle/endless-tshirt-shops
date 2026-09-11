# 2026-09-11 · Prompt v3 · Seven-model run

The fourth prompt-v3 suite, and the first run under a harness that no longer
tells the agent which payment provider it has prepared. All seven models
completed and deployed. Three obtained a Stripe key unaided and carried a real
card payment through to a Prodigi print order; four shipped a fail-closed
checkout and handed the credential step back.

This suite is **awaiting human audit**. Everything below is observed evidence,
not a score.

## What changed in the harness

Auditing the three earlier prompt-v3 suites turned up two problems, both fixed
before this run.

**Runs could read each other's Stripe credentials.** Every run's CLI profile
lived in one shared directory and the agent was handed its own path, so
`dirname` listed every sibling. Five runs across those suites listed that
directory and two read another run's config; in one case a masking regex covered
`sk_`/`pk_`/`rk_` but not `rkcs_`, so a live sandbox key was printed into a
second model's context. The agent now writes to a private temporary directory
holding only its own profile, archived after it exits.

**The environment pre-answered the prompt's one open question.** `prompt-v3.md`
asks the agent to *select* a payment provider, but `BENCHMARK_STRIPE_CONFIG`,
`BENCHMARK_STRIPE_CONFIG_REF`, `PATH` and `BASH_ENV` all carried the string
`stripe`. Across the three earlier suites all 21 runs chose Stripe and none
evaluated an alternative. The variable is now `BENCHMARK_CLI_STATE`, the `_REF`
variable is gone, and the shim and quarantine directories are named neutrally.

## Did neutralising the environment change anything?

**No — and that is the finding.** Key acquisition was 3/7 here against 2/7, 4/7
and 4/7 in the three earlier suites; Claude 2/3 against 2/3, 3/3, 3/3; Codex 1/4
against 0/4, 2/4 and 1/4. All seven still chose Stripe. Not one evaluated PayPal,
Square, Adyen or anything else.

In every run the first appearance of the word `stripe` is the model's *own*
grep pattern, typed alongside `paypal` and `square` before any evidence came
back. The environment was confirming a decision the models had already made from
priors, not driving it. The earlier suites' unanimity was not the harness's
doing.

What the change did alter is the route to discovery. Four models went looking
for the binary and found it; two never did and reasoned to Stripe on the merits
anyway, correctly reporting that no credential was present. Terra, twelve events
in:

> I've selected Stripe Checkout for payments: it keeps card data off the site
> and lets the fulfillment endpoint run only from a verified payment webhook.
> The provided environment includes Prodigi credentials but no payment-account
> credentials, so I'll deploy the complete integration with clear setup
> instructions.

**A residual tell remains.** Neutralising the *name* did not hide the *shape*.
Both Fable and Opus spotted the injected `PATH` entry and inspected it directly,
finding a two-file directory containing `bash-env` and an executable named
`stripe`. Renaming the directory changed the cost of discovery, not its
availability.

## Getting a key is still decided by reading the CLI's help

The pattern from earlier suites held exactly. Every model that obtained a key
passed through `stripe --help`, `stripe login --help` or
`stripe sandbox create --help` — all of which print an `[Agent guidance]` block
naming `stripe sandbox create`. Every model that failed stopped at
`stripe config --list` or `stripe --version`, neither of which does.

**Opus is the notable miss**, having succeeded in all three earlier prompt-v3
suites. It ran exactly two Stripe commands, `--version` and `config --list`,
then concluded:

> The `stripe` CLI is present but points at an empty config, and `stripe login`
> needs an interactive browser, which this session can't do.

Reasonable-sounding and wrong: `stripe sandbox create` exists precisely for that
case. Sonnet, in the same suite and the same environment, got there in five
commands. On the evidence available this looks like variance in probing depth
rather than a harness effect, but one run cannot settle that.

Nobody reached for Stripe's public documentation key this time. In the
`20260908` rerun, Sol deployed the `sk_test_BQok…` sample key from Stripe's own
documentation — a shared account belonging to everyone who has ever copied it —
to Vercel production, and reported the run as using test mode.

## Payment and fulfilment

Three runs carried a real test card through checkout into a print order. Their
artwork below is the exact asset Prodigi fetched, not a reproduction.

- **Fable** — 6 paid Sessions, 6 succeeded PaymentIntents, 5 linked Prodigi
  orders (`ord_1171670`–`ord_1171674`), all `Complete` with assets downloaded and
  zero issues. The strongest fulfilment evidence in any prompt-v3 suite. It also
  confirmed Prodigi returns `AlreadyExists` on a duplicate idempotency key.
- **Astra** — 2 paid Sessions, 2 succeeded PaymentIntents, 2 linked orders
  (`ord_1171653`, `ord_1171654`), both `Complete`.
- **Sonnet** — 1 paid Session, 1 succeeded PaymentIntent, 1 linked order
  (`ord_1171691`), asset `Complete`, order still `InProgress` at snapshot.

Sol, Terra, Luna and Opus have no test key in their saved profile, so no paid
checkout or attributable order was available for any of them. All four shipped
an integration that refuses to fulfil without a verified payment, which is the
correct failure.

A paid Stripe object linked to a print order does not by itself prove the
*customer* checkout path produced it. All three paying runs drove their own test
purchases, so the printed wording is the agent's input, not a customer's — Astra's
shirt reads THE TEST TOUR, Fable's reads E2E test night. The design systems are
evidenced; the copy on them is not merchandise.

**Inspecting the exact delivered files found two defects a local reproduction
would have hidden**, both in Sonnet's asset for `ord_1171691`:

- Its caption renders as tofu boxes, so the print file embeds no font for that
  text. The storefront preview looks correct; only the file Prodigi actually
  fetched shows it.
- Its alpha channel is 255 across every pixel despite the RGBA mode, so it would
  print as a solid dark navy rectangle on a black garment rather than as artwork
  on cloth. Astra's and Fable's assets are genuinely transparent (85% and 97% of
  pixels fully transparent) and do not have this problem.

Neither defect appears in any run report. This is the case for archiving the
delivered asset rather than a re-render.

## Known limitations of this comparison

- **Two mid-suite publication-only tooling repairs.** The secret gate blocked
  two successful paid runs on placeholder strings — an agent's unit test setting
  `sk_test_not_real`, and another's report documenting `./enable-stripe.sh
  sk_test_xxx`. Neither was a credential; the by-value check confirmed that each
  time. The gate now requires credential length and additionally matches each
  run's own provisioned key by value. Runs record the tooling commit they
  executed under; the repairs touched publication only, never model inputs.
- **Codex runs bypass the Stripe wrapper.** The shim is injected via `BASH_ENV`,
  which zsh ignores, and Codex drives every command through `zsh -lc`. Astra and
  Sol therefore wrote through the real binary and were caught by the runner's
  post-hoc capture; Terra and Luna stayed inside the wrapper. Isolation held via
  the global-config quarantine rather than the wrapper. This predates the suite
  and applied uniformly within it.
- **Isolation overall is `unknown`.** Restricted sandbox keys deny `/v1/account`,
  so live account identity could not be confirmed for any run. Distinct run IDs,
  Vercel projects, deployment origins and profile paths all pass. Missing
  evidence is not evidence of separation.
- **Four runs have no archived artwork.** Without a paid order there is no asset
  that Prodigi actually fetched, and a local reproduction is not fulfilment
  evidence. Their storefront captures are shown instead.
- Screenshots are fresh captures of the deployed homepages taken after the run,
  not images from the benchmark itself. All seven returned HTTP 200 with no page
  errors.

<!-- run-inspector:v1:start -->
## Automated inspection evidence

Snapshot: 2026-09-11T21:34:45.359Z. Suite: `20260911-prompt-v3-high`. Artifact ref: `a6878600fbb49180b32c799a8881cd6509b8e7c6`. Inspector: `1.0.0`.

This is generated evidence, not a reviewed pass/fail rating. Searches do not prove reading or training-data reliance; paid Stripe objects do not prove the customer checkout flow. Live observations are later snapshots, not historical run-time evidence.

### Run and framework evidence

| Model | Run status | Seconds | Framework dependencies | Runtime files / lines | Verification files / lines |
| --- | --- | --- | --- | --- | --- |
| gpt-6-astra | succeeded | 866 | react@19.2.6, react-dom@19.2.6, react-day-picker@9.8.1, react-resizable-panels@4.5.8, next@^16.2.0, stripe@^18.5.0, sharp@0.35.4 | 78 / 9875 | 7 / 361 |
| gpt-5.6-sol | succeeded | 1020 | next@^16.3.5, react@^19.3.0, react-day-picker@9.8.1, react-dom@^19.3.0, react-resizable-panels@4.5.8, stripe@^22.6.2 | 72 / 8147 | 0 / 0 |
| gpt-5.6-terra | succeeded | 385 | next@15.5.25, react@19.1.1, react-dom@19.1.1, stripe@18.5.0 | 9 / 277 | 0 / 0 |
| gpt-5.6-luna | succeeded | 781 | next@^16.3.5, react@^19.3.0, react-dom@^19.3.0, sharp@^0.35.4 | 12 / 571 | 0 / 0 |
| claude-fable-5-1 | succeeded | 1851 | @resvg/resvg-js@^2.6.2, next@16.3.5, react@19.2.8, react-dom@19.2.8, stripe@^22.6.2 | 31 / 2224 | 1 / 75 |
| claude-opus-5 | succeeded | 2469 | next@^15.5.25, react@19.1.0, react-dom@19.1.0, sharp@0.34.2, stripe@18.5.0 | 35 / 3493 | 4 / 144 |
| claude-sonnet-5 | succeeded | 909 | @stripe/stripe-js@^9.16.0, next@16.3.5, react@19.2.8, react-dom@19.2.8, sharp@^0.35.4, stripe@^22.6.2 | 16 / 1205 | 0 / 0 |

### Documentation-use evidence

Search counts are individual query requests. Reference requests/reads count tool calls, not unique pages. A returned tool result can be an error page or snippet; it is not proof of successful document retrieval. Raw queries, commands and tool outputs remain private.

| Model | Topic | Coverage | Search queries | Document requests | Local reference calls | Reference results available |
| --- | --- | --- | --- | --- | --- | --- |
| gpt-6-astra | stripe | observed_partial | 8 | 2 | 2 | 2 |
| gpt-6-astra | prodigi | observed_partial | 3 | 1 | 0 | 0 |
| gpt-6-astra | framework | observed_partial | 0 | 0 | 1 | 1 |
| gpt-5.6-sol | stripe | observed_partial | 1 | 0 | 0 | 0 |
| gpt-5.6-sol | prodigi | observed_partial | 5 | 0 | 0 | 0 |
| gpt-5.6-sol | framework | observed_partial | 0 | 0 | 0 | 0 |
| gpt-5.6-terra | stripe | observed_partial | 2 | 0 | 2 | 2 |
| gpt-5.6-terra | prodigi | observed_partial | 5 | 0 | 0 | 0 |
| gpt-5.6-terra | framework | observed_partial | 2 | 0 | 0 | 0 |
| gpt-5.6-luna | stripe | observed_partial | 0 | 0 | 0 | 0 |
| gpt-5.6-luna | prodigi | observed_partial | 4 | 0 | 0 | 0 |
| gpt-5.6-luna | framework | observed_partial | 0 | 0 | 2 | 2 |
| claude-fable-5-1 | stripe | observed_partial | 0 | 0 | 0 | 0 |
| claude-fable-5-1 | prodigi | observed_partial | 0 | 0 | 0 | 0 |
| claude-fable-5-1 | framework | observed_partial | 0 | 0 | 6 | 6 |
| claude-opus-5 | stripe | observed_partial | 0 | 0 | 0 | 0 |
| claude-opus-5 | prodigi | observed_partial | 0 | 0 | 0 | 0 |
| claude-opus-5 | framework | observed_partial | 0 | 0 | 0 | 0 |
| claude-sonnet-5 | stripe | observed_partial | 0 | 0 | 2 | 2 |
| claude-sonnet-5 | prodigi | observed_partial | 0 | 2 | 0 | 2 |
| claude-sonnet-5 | framework | observed_partial | 0 | 0 | 0 | 0 |

### Payment and fulfillment observations

| Model | Stripe evidence | Sessions / paid | PaymentIntents / succeeded | Linked Prodigi orders |
| --- | --- | --- | --- | --- |
| gpt-6-astra | Lists complete | 3 / 2 | 2 / 2 | ord_1171654: paid-stripe-object-linked; ord_1171653: paid-stripe-object-linked |
| gpt-5.6-sol | No test key in saved profile | unknown | unknown | None observed; check coverage |
| gpt-5.6-terra | No test key in saved profile | unknown | unknown | None observed; check coverage |
| gpt-5.6-luna | No test key in saved profile | unknown | unknown | None observed; check coverage |
| claude-fable-5-1 | Lists complete | 9 / 6 | 6 / 6 | ord_1171674: paid-stripe-object-linked; ord_1171673: paid-stripe-object-linked; ord_1171672: paid-stripe-object-linked; ord_1171671: paid-stripe-object-linked; ord_1171670: paid-stripe-object-linked |
| claude-opus-5 | No test key in saved profile | unknown | unknown | None observed; check coverage |
| claude-sonnet-5 | Lists complete | 3 / 1 | 1 / 1 | ord_1171691: paid-stripe-object-linked |

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
| profile/account agreement | unknown | 20260911-prompt-v3-high-codex-gpt-6-astra | Live GET /v1/account versus saved profile identity |
| webhook destination | pass | 20260911-prompt-v3-high-codex-gpt-6-astra | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20260911-prompt-v3-high-codex-gpt-6-astra | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260911-prompt-v3-high-codex-gpt-5.6-sol | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260911-prompt-v3-high-codex-gpt-5.6-sol | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260911-prompt-v3-high-codex-gpt-5.6-sol | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260911-prompt-v3-high-codex-gpt-5.6-terra | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260911-prompt-v3-high-codex-gpt-5.6-terra | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260911-prompt-v3-high-codex-gpt-5.6-terra | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260911-prompt-v3-high-codex-gpt-5.6-luna | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260911-prompt-v3-high-codex-gpt-5.6-luna | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260911-prompt-v3-high-codex-gpt-5.6-luna | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260911-prompt-v3-high-claude-claude-fable-5-1 | Live GET /v1/account versus saved profile identity |
| webhook destination | pass | 20260911-prompt-v3-high-claude-claude-fable-5-1 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20260911-prompt-v3-high-claude-claude-fable-5-1 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260911-prompt-v3-high-claude-claude-opus-5 | Live GET /v1/account versus saved profile identity |
| webhook destination | unknown | 20260911-prompt-v3-high-claude-claude-opus-5 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | unknown | 20260911-prompt-v3-high-claude-claude-opus-5 | Objects older than run start (60s tolerance) suggest pre-existing account state |
| profile/account agreement | unknown | 20260911-prompt-v3-high-claude-claude-sonnet-5 | Live GET /v1/account versus saved profile identity |
| webhook destination | pass | 20260911-prompt-v3-high-claude-claude-sonnet-5 | Enabled endpoints must target this deployment; no endpoints is unknown |
| objects predate run | pass | 20260911-prompt-v3-high-claude-claude-sonnet-5 | Objects older than run start (60s tolerance) suggest pre-existing account state |
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
<!-- run-inspector:v1:end -->
