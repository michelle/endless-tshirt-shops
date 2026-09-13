# Runner harness prompt

Instructions for an outer harness driving one comparison suite end to end.
Inject all credentials through the environment; never put keys in this file,
in commands, in logs or in the final report.

## Execute the runs

Run these model IDs through the adapters shown, one at a time, in this order:

1. `gpt-6-astra` — codex
2. `gpt-5.6-sol` — codex
3. `gpt-5.6-terra` — codex
4. `gpt-5.6-luna` — codex
5. `claude-fable-5-1` — claude
6. `claude-opus-5` — claude
7. `claude-sonnet-5` — claude

Wait for each run — including result publication and cleanup — before starting
the next. Do not parallelize. Use one explicitly chosen reasoning level for all
seven; default to `high`. If a run fails, record the failure accurately and
continue to the next model.

Use `scripts/run-benchmark`, one suite ID passed to every attempt with
`--suite-id`, and run IDs of the form `<suite-id>-<adapter>-<model>`. Give
retries a further suffix and report them separately. Pass the caller's prompt
with `--prompt-file` (default `prompt.md` only if none was specified). Allow
enough time to build, test and deploy; do not impose a short outer timeout.

The runner requires a clean worktree. Either stash pre-existing changes and
restore them after the last run, or — better — use a dedicated clean worktree at
the intended base commit and let the controller drive it:

```sh
node scripts/run-suite.mjs --suite <suite-id> \
  --prompt <prompt-file> --effort high --timeout 7200
```

It makes the same seven serial runner calls, records durable private progress,
stops if publication or cleanup fails, and invokes the inspector at the end. Use
a persistent process supervisor; do not leave an unawaited promise as the only
controller.

If publication fails after a model has run, preserve and recover that attempt
rather than paying to run it again. Archived whitespace warnings do not block
publication, but `scripts/check-run-artifacts` secret checks must pass. Then
`--resume` verifies the published attempts and continues from the next model.
Record any mid-suite tooling repair in the final summary.

## Collect the evidence

```sh
git fetch origin benchmark-results
node scripts/run-inspector/inspect.mjs --suite <suite-id> --expected-runs 7 --live
```

Use the inspector rather than writing new transcript parsers, pagination
scripts or image utilities per suite. See
[`scripts/run-inspector/README.md`](scripts/run-inspector/README.md) for
snapshot replay, artwork selection, capture staging and summary refresh. Pass
`--profiles` if the saved Stripe profiles belong to another worktree.

Raw tool streams stay private under
`.benchmark-secrets/transcripts/<run-id>/`; only `events.jsonl` and
`capture.json` are committed. Never publish raw transcripts or API snapshots.

Then audit independently. Inspect the committed artifacts, saved Stripe
profiles, Prodigi sandbox orders and live deployments — do not rely on the
agents' own completion reports. Missing API permissions or tool history must
stay `unknown`, not become a pass or a zero. Paid-object linkage is not proof of
the customer checkout path.

## Write the summary

Cover, per model:

- **Overview** — model, reasoning level, status, elapsed time, deployment URL,
  HTTP reachability, exact page title.
- **Technology** — framework and other major choices.
- **Payments** — which provider the agent chose and how (hosted Checkout vs.
  Elements/PaymentIntents vs. Elements/Sessions), objects created, important
  fields and metadata, Customer creation, webhook events and registration.
- **Application flow** — exact fulfillment endpoints and call order relative to
  payment, plus failure and recovery behaviour at every step. For prompts that
  rebuild datetime.store, also confirm no Scalable Press calls remain.
- **Design correctness** — how and when the design is fixed, and where it is
  persisted; include a real final example. Decide whether a genuinely printable
  image reached Prodigi. `assetStatus=Complete`, HTTP 200 and correct dimensions
  are not proof: check nontransparent pixel count and bounds, fetch Prodigi's
  thumbnail, and view white-on-transparent artwork against a dark background.
- **Testing** — how the agent validated its build, what you independently
  confirmed, and what remains untested.
- **Token usage** — fresh input, cache reads, cache writes where available, and
  output tokens.
- **Isolation** — sandbox account identity, object isolation, registered
  webhooks, saved profile, any usable claim URL, and whether Prodigi
  credentials or account state were shared between runs.
- **Handoff** — exact next steps for a human: claiming sandboxes, replacing
  credentials, registering live webhooks, validating garment SKUs, and any test
  artifacts or hard-coded values still needing code changes.
- **Complexity** — runtime files and lines, verification code, and the
  operational complexity a maintainer would inherit.

Report documentation use per topic (payments, Prodigi, frameworks), counting
searches, document requests, local reference reads and failed or incomplete
calls separately. Do not infer training-data reliance or comprehension from the
presence or absence of lookups.

## Publish to the viewer

```text
run_viewer/public/suites/<suite-id>/summary.md
run_viewer/public/suites/<suite-id>/prompt.md
run_viewer/public/suites/<suite-id>/runs/<run-id>/final.md
run_viewer/public/suites/<suite-id>/runs/<run-id>/design.<ext>
```

Copy `final.md` verbatim and the generated report to `summary.md`. Archive the
prompt from the suite's recorded base commit, preserving its original bytes, and
check its SHA-256 against run metadata; register
`prompt: { path, file, revision, sha256 }` on the viewer suite. Every suite
needs this, legacy imports included.

Keep the human audit outside the inspector's generated markers and use
`--update-summary` to refresh the automated block without touching editorial
findings or heading permalinks.

The primary image must represent the customer ordering path: prefer the exact
source Prodigi fetched for a genuine paid order, even if that asset is wrong.
Failing that, recover artwork recorded on a real Checkout Session; failing that,
reproduce the deterministic app route from committed code and recorded inputs.
Label hosted-unpaid and local reproductions explicitly — neither proves payment
or fulfillment.

Check the committed runtime and test transcript before attributing an asset to
the application. A standalone smoke order or synthetic webhook may use arbitrary
inputs, such as `/og.png` or an icon, that the customer flow never supplies.
Archive those separately as `submitted.<ext>` and describe them as test
evidence. Artwork quality can pass independently of unverified delivery; do not
infer a working integration, or a wrong-asset bug, from a smoke test.

Preserve the complete original canvas, dimensions, format, alpha channel and
artwork position. Do not crop, resize, flatten, recolor or substitute a
thumbnail. Record dimensions, alpha mode, nontransparent bounds, recovery
source, order ID where applicable, and whether the evidence is paid, synthetic,
direct or local. Never store credentials, signed URLs, webhook secrets, raw
transcripts, customer PII or payment client secrets in viewer data.

Register the suite and deployment URLs in `run_viewer/app/data.ts`, then capture
the storefronts once the deployments have settled:

```sh
cd run_viewer && npm ci && npx playwright install chromium
npm run capture -- --suite <suite-id>
```

Never submit checkout forms while capturing. Check `capture-errors.json` and
report missing captures rather than substituting another run's screenshot.
Finally run `npm run predeploy` before committing viewer changes.

Treat the results as directional case studies, not a formal ranking.
