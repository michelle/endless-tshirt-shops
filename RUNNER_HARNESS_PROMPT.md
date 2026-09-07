# Runner harness prompt

Use this prompt from an outer harness to run an informal comparison. Inject all
credentials through the environment; do not put keys in this file, commands,
logs, or the final report.

Run the benchmark in this repository against these exact model IDs, in this
exact order:

1. `gpt-6-astra` through the Codex adapter
2. `gpt-5.6-sol` through the Codex adapter
3. `gpt-5.6-terra` through the Codex adapter
4. `gpt-5.6-luna` through the Codex adapter
5. `claude-fable-5-1` through the Claude adapter
6. `claude-opus-5` through the Claude adapter
7. `claude-sonnet-5` through the Claude adapter

Run one model at a time. Wait for each run—including result publication and
repository cleanup—to finish before starting the next. Do not parallelize model
runs. Use the same explicitly selected reasoning level for all seven; default to
high unless the caller specifies another level. Continue to the next model if a
run fails, and record the failure accurately.

Use the repository's `scripts/run-benchmark` runner and unique run IDs. Select
one suite ID for the comparison and pass it with `--suite-id` to every attempt.
Prefix every run ID with that suite ID and suffix it with the adapter and model;
give retries a further attempt suffix and report them separately. Pass the
caller's selected task prompt to every run with `--prompt-file`; default to
`prompt.md` only when no prompt was specified. Preserve pre-existing user
changes. The runner requires a clean worktree, so stash those changes before the
first run and restore them after the last run. Give each run enough time to
build, test, and deploy; do not impose a short outer timeout.

Alternatively, preserve local changes by using a dedicated clean worktree at
the intended base commit. `node scripts/run-suite.mjs --suite <suite-id>
--prompt <prompt-file> --effort high --timeout 7200` orchestrates the same
seven serial runner calls and records durable private progress. It stops if
publication or cleanup fails and invokes the inspector after all attempts.
Use a persistent process supervisor when launching unattended; do not leave
an unawaited in-tool promise as the only controller.

If publication fails after model execution, preserve and recover that attempt
instead of paying to rerun it. Archived whitespace is a warning; secret checks
must still pass via `scripts/check-run-artifacts`. After recovery, `--resume`
verifies published attempts and continues from the next model. See README for
the pinned-base, controller-lock and tooling-revision requirements. Record any
mid-suite tooling repair in the final summary.

After all seven attempts, use the durable inspector first; do not rewrite
ad-hoc transcript parsers, pagination scripts or image-stat utilities for each
suite:

```sh
git fetch origin benchmark-results
node scripts/run-inspector/inspect.mjs --suite <suite-id> --expected-runs 7 --live
```

See `scripts/run-inspector/README.md` for private snapshot replay, explicit
artwork selection, browser capture staging and summary refresh. Supply
`--profiles` if the saved Stripe profiles belong to another worktree. Missing
API permissions or tool history must remain unknown, not pass/zero. The
inspector does not execute archived apps, create payments/orders, assign
ratings or publish. Review its evidence and perform the remaining semantic
audit; do not treat paid-object linkage as proof of the customer checkout path.

New runs retain full raw tool streams privately under
`.benchmark-secrets/transcripts/<run-id>/`; only filtered events and capture
coverage are committed. Never publish raw transcripts or API snapshots. Old
Claude final-result-only logs cannot answer documentation-use questions. Report
searches, document requests, local reference reads and failed/incomplete calls
separately for Stripe, Prodigi and frameworks. Do not infer training-data
reliance or comprehension from absent/present lookups.

Independently inspect the committed artifacts, saved
Stripe profiles, Prodigi sandbox orders, and live deployments. Do not rely only
on the agents' completion reports. Create a Markdown report covering:

- **Overview:** model, reasoning level, status, elapsed time, deployment URL,
  HTTP reachability, and exact page title.
- **Framework and major technology choices.**
- **Stripe integration:** hosted Checkout vs. Elements/PaymentIntents vs.
  Elements/CheckoutSessions; Stripe objects created; important fields and
  metadata; Customer creation; and webhook events and endpoint registration.
- **Application flow:** exact Prodigi endpoints and API call order relative to
  payment; confirm that no Scalable Press calls remain; document failure and
  recovery behavior for every step.
- **Design correctness:** how and when the timestamp/design is frozen and where
  it is persisted; include a real final-design example. Determine whether a
  genuinely printable image reached Prodigi. Do not treat
  `assetStatus=Complete`, HTTP 200, or correct dimensions alone as proof:
  inspect nontransparent pixel count and bounds, fetch Prodigi's thumbnail, and
  view white-on-transparent artwork against a dark proof background.
- **Testing:** how the agent validated its build, what was independently
  confirmed, and what remains untested.
- **Token usage:** fresh input, cache reads, cache creation/write where
  available, and output tokens.
- **Sanity-check isolation:** Stripe sandbox account identity, object isolation,
  registered webhooks, saved profile, and any usable claim URL; also state
  whether Prodigi credentials/account state were shared between runs.
- **Model handoff to a human:** exact next steps, including claiming sandboxes,
  replacing credentials, registering live webhooks, validating garment SKUs,
  and identifying test artifacts or hard-coded values that still require code
  changes.
- **Complexity:** runtime files and lines of code, tests/verification code, and
  operational and implementation complexity relevant to future maintenance.

After the independent audit, prepare viewer artifacts under this predictable
layout:

```text
run_viewer/public/suites/<suite-id>/summary.md
run_viewer/public/suites/<suite-id>/prompt.md
run_viewer/public/suites/<suite-id>/runs/<run-id>/final.md
run_viewer/public/suites/<suite-id>/runs/<run-id>/design.png
```

For Show prompt, archive the task prompt from the suite's recorded base commit,
preserving its original bytes, and check its SHA-256 against run metadata.
Register `prompt: { path, file, revision, sha256 }` on the viewer suite. Do not
substitute today's prompt file or the runner instructions. Every suite,
including legacy imports, needs this asset; pre-deploy checks validate it.

Keep the human audit outside the inspector's generated markers. Use
`--update-summary run_viewer/public/suites/<suite-id>/summary.md` to add or
refresh automated evidence without replacing editorial findings or heading
permalinks. Use `--artwork <private-plan.json>` for byte-preserving recovery and
alpha/hash statistics; inspect its changeable-background `artwork/proof.html`.
`--capture` can stage screenshots, favicons, social previews and final outputs
privately before viewer import. Review every staged artifact and retain the
existing short run IDs when updating an existing suite. Before committing or
publishing, run the viewer's `npm run predeploy` asset/permalink checks.

Use the image's real extension when it is not PNG. Copy `final.md` verbatim and
copy the generated suite report to `summary.md`. The primary viewer image should
represent the customer ordering path. Prefer the exact source Prodigi fetched
for a genuine paid app order, even if that customer-path asset is wrong. Without
a paid order, recover artwork recorded in a real customer Checkout Session;
otherwise reproduce the deterministic app route only from committed code and
recorded timestamp/variant inputs. Label hosted-unpaid and local reproductions
explicitly; neither proves payment or fulfillment.

Inspect the committed runtime and test transcript before attributing an asset
to the application. A separate command-line smoke order or synthetic webhook
may use arbitrary test inputs, such as /og.png or an icon, that the customer
flow never supplies. Archive these separately as `submitted.<extension>` and
describe them as test evidence, not the customer's design. Artwork quality may
pass independently of unverified delivery; do not infer a working integration
or a wrong-customer-asset bug from a standalone smoke test.

Preserve the complete original canvas, pixel dimensions, format, alpha channel,
and artwork position. Do not crop, resize, flatten, recolor, or substitute a
thumbnail. Show a social-preview asset as the main image only when evidence
establishes that the customer flow submits it, not merely a standalone smoke
test. Derived dark-background proofs may be kept
separately but are not the viewer design. Record dimensions, alpha mode,
nontransparent bounds, recovery source, order ID when applicable, and whether
the evidence is paid, synthetic, direct, or local in the viewer manifest. Do
not store credentials, signed private URLs, webhook secrets, raw transcripts,
customer PII, or payment client secrets in viewer data.

Register the suite and run deployment URLs in `run_viewer/app/data.ts`. After
the deployments settle, capture their initial browser viewports, favicons, and social previews:

```bash
cd run_viewer
npm ci
npx playwright install chromium
npm run capture -- --suite <suite-id>
```

This archives `storefront.png`, available `favicon.*`, and published `social-preview.*` files beside each run's
artwork and writes `public/suites/<suite-id>/storefronts.json`. The viewer loads
that manifest automatically for any registered suite. Use the same 1440 × 900
viewport for comparisons. Keep the capture timestamp, URL, HTTP status, and
missing/unavailable favicon evidence; these are fresh captures of deployments,
not historical screenshots from the benchmark. Never submit checkout forms
while capturing. Existing captures are skipped; use `--run <run-id>` for a
targeted retry and `--overwrite` only for an intentional refresh. Check
`capture-errors.json` and report missing captures instead of substituting
another run's screenshot. See `run_viewer/README.md` for browser setup options.

Social previews are fetched unchanged from homepage `og:image` metadata, with
`twitter:image` as a fallback. Record the source, dimensions, capture time, and
found/missing/unavailable state in the manifest. Never recreate a missing social
card or treat it as customer print artwork. Older manifests are automatically
backfilled without recapturing screenshots; use `--social-only --overwrite` for
an intentional social-only refresh. Run drawers link via `?suite=<suite-id>&run=<short-run-id>`;
summary headings expose stable `#summary-…` links.

Treat the results as directional case studies, not a formal ranking.
