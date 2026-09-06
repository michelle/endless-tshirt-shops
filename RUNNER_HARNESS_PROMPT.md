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

After all seven attempts, independently inspect the committed artifacts, saved
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
run_viewer/public/suites/<suite-id>/runs/<run-id>/final.md
run_viewer/public/suites/<suite-id>/runs/<run-id>/design.png
```

Use the image's real extension when it is not PNG. Copy `final.md` verbatim and
copy the generated suite report to `summary.md`. For each design, prefer the
exact original source file that Prodigi fetched for the representative order.
If no intended design reached Prodigi, recover the exact hosted artwork stored
in Stripe metadata; if that is unavailable, reproduce the deterministic artwork
route only from committed code plus recorded timestamp and variant inputs.
Label those fallbacks accurately—never imply that locally reproduced or
synthetic fulfillment evidence is a paid end-to-end print.

Preserve the complete original canvas, pixel dimensions, format, alpha channel,
and artwork position. Do not crop, resize, flatten, recolor, or replace it with
a thumbnail or social-preview asset. Derived dark-background proofs may be kept
separately but are not the viewer design. Record dimensions, alpha mode,
nontransparent bounds, recovery source, order ID when applicable, and whether
the evidence is paid, synthetic, direct, or local in the viewer manifest. Do
not store credentials, signed private URLs, webhook secrets, raw transcripts,
customer PII, or payment client secrets in viewer data.

Register the suite and run deployment URLs in `run_viewer/app/data.ts`. After
the deployments settle, capture their initial browser viewports and favicons:

```bash
cd run_viewer
npm ci
npx playwright install chromium
npm run capture -- --suite <suite-id>
```

This archives `storefront.png` and available `favicon.*` files beside each run's
artwork and writes `public/suites/<suite-id>/storefronts.json`. The viewer loads
that manifest automatically for any registered suite. Use the same 1440 × 900
viewport for comparisons. Keep the capture timestamp, URL, HTTP status, and
missing/unavailable favicon evidence; these are fresh captures of deployments,
not historical screenshots from the benchmark. Never submit checkout forms
while capturing. Existing captures are skipped; use `--run <run-id>` for a
targeted retry and `--overwrite` only for an intentional refresh. Check
`capture-errors.json` and report missing captures instead of substituting
another run's screenshot. See `run_viewer/README.md` for browser setup options.

Treat the results as directional case studies, not a formal ranking.
