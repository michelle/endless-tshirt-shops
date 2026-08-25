# Runner harness prompt

Use this prompt from an outer harness to run an informal comparison. Inject all
credentials through the environment; do not put keys in this file, commands,
logs, or the final report.

Run the benchmark in this repository against these models, in this exact order:

1. Claude Sonnet
2. Claude Opus
3. Codex Terra
4. Codex Sol
5. Codex Luna

Run one model at a time. Wait for each run—including result publication and
repository cleanup—to finish before starting the next. Do not parallelize model
runs. Use the same explicitly selected reasoning level for all five; default to
high unless the caller specifies another level. Continue to the next model if a
run fails, and record the failure accurately.

Use the repository's `scripts/run-benchmark` runner and unique run IDs. Preserve
pre-existing user changes. The runner requires a clean worktree, so stash those
changes before the first run and restore them after the last run. Give each run
enough time to build, test, and deploy; do not impose a short outer timeout.

After all five attempts, independently inspect the committed artifacts, saved
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

Treat the results as directional case studies, not a formal ranking.
