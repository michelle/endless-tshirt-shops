# endless-tshirt-shop benchmark

Informally benchmark coding agents against [`prompt.md`](prompt.md). A run starts with an empty workspace, preserves the generated app and completion report under `runs/<run-id>/`, and appends it to the shared `benchmark-results` branch.

## Prerequisites

```sh
# macOS
brew install stripe/stripe-cli/stripe vercel-cli coreutils
vercel login                         # the one interactive setup step
export PRODIGI_API_KEY='prodigi-test-key'
```

`PRODIGI_API_KEY` should be a sandbox/test key. Node.js 20.11+, Python 3, `timeout` (Linux) or `gtimeout` (macOS Coreutils), Git, and an `origin` remote are required. For CI, use masked `PRODIGI_API_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`; Vercel must be invoked with its token and `--yes`.

## Run

Commit or stash all existing work first: the runner refuses a dirty repository so each run has a reproducible base commit.

```sh
scripts/run-benchmark \
  --adapter codex \
  --model gpt-6-astra \
  --suite-id 20260905-beauty-high \
  --run-id 20260905-beauty-high-codex-astra \
  --prompt-file prompt-beauty.md \
  --reasoning-effort high \
  --timeout 3600

scripts/run-benchmark \
  --adapter claude \
  --model claude-fable-5-1 \
  --suite-id 20260905-beauty-high \
  --run-id 20260905-beauty-high-claude-fable-5-1 \
  --prompt-file prompt-beauty.md \
  --reasoning-effort high \
  -- --max-budget-usd 20
```

Current comparison models are `gpt-6-astra`, `gpt-5.6-sol`, `gpt-5.6-terra`,
`gpt-5.6-luna`, `claude-fable-5-1`, `claude-opus-5`, and
`claude-sonnet-5`. Use pinned full IDs for reproducible comparisons.

The runner invokes the selected CLI non-interactively in an initially empty workspace, commits one immutable `runs/<run-id>/` result to `benchmark-results`, pushes it to `origin`, and returns to the original branch. It records failed or timed-out runs too. `--prompt-file` selects a regular prompt file inside the repository and defaults to `prompt.md`; the selected path and content hash are recorded in metadata. `--suite-id` records a shared identifier for grouping related attempts. Each run receives a unique Vercel project name, `benchmark-<run-id>`, through `$BENCHMARK_VERCEL_PROJECT`, so its deployment cannot replace another run's deployment. It also gives every agent an isolated Stripe CLI config and transparently applies it to every `stripe` command, including commands launched through a login shell. That config lives in a private temporary directory for the duration of the run and holds nothing but this run's profile, so an agent cannot reach a sibling run's credentials by listing the directory it was handed. It is archived to `.benchmark-secrets/stripe/<run-id>.toml` after the agent exits, where it is permissions-protected and ignored by Git. The runner never creates or claims it—the agent does that itself.

The environment handed to the agent is deliberately provider-neutral. The prompt asks the agent to select a payment provider, so no variable name, variable value, `PATH` entry or `BASH_ENV` path discloses which provider the harness has prepared; the wrapped CLI is reachable only by invoking it. Agent-facing variables are asserted free of the provider name by `tests/run-benchmark-test.sh`.

While the agent runs, the normal global Stripe config is atomically quarantined and ambient Stripe credential variables are unset; the global config is restored afterward on success, failure, or timeout. A config written directly to the global path is captured under `.benchmark-secrets/stripe/` before restoration.

These measures close the paths an agent is *handed*. They are not a sandbox: the agent runs as the invoking user and can still reach the archive, this repository, `$HOME` and `/tmp` with an explicit search. Treat run isolation as advisory and run the harness under a dedicated user account or container if that matters. Temporary execution branches remain local and are removed after a successful push. Review and compare all artifacts together on `benchmark-results`. A failed push leaves the local publication branch and commit intact, then exits nonzero.

Codex uses its non-interactive exec mode with automatic approvals, ephemeral sessions, and both native memory features explicitly disabled. Claude uses print mode with bypassed permissions, session persistence disabled, and environment-enforced disabling of auto-memory and all `CLAUDE.md` memory/instruction loading. Run this only in an isolated, externally sandboxed environment and with test-only credentials.

## Run contents

These files are committed under `runs/<run-id>/` on `benchmark-results`.

```text
runs/<run-id>/
  workspace/       generated application code
  final.md         agent's final completion report
  agent.log        public tool-evidence projection (not the raw transcript)
  events.jsonl     versioned normalized tool/web events, excluding raw inputs/results
  capture.json     capture coverage, missing-history warnings, schema version
  metadata.json    suite, prompt, model, effort, usage, base/tree hashes, status, timing, URL
  usage.json       provider-reported token usage, including normalized new-input tokens when available
```

Both adapters retain incremental, permissions-protected raw events at `.benchmark-secrets/transcripts/<run-id>/transcript.jsonl`, including partial runs. These private files survive successful result cleanup and are never committed. They can contain credentials, customer data, source URLs and full tool outputs; do not publish them. There is no automatic retention expiry. The temporary `agent.raw.log` is also untracked and removed with successful run cleanup.

Public tool events retain tool names, lifecycle status, topic classifications, documentation URL paths and hashed search queries, but not commands, raw query text or tool results. The staged-output secret scan remains a separate defense for generated source and final reports, not a general PII guarantee. Review artifacts before further publication. Older runs retain their original log formats; missing Claude tool history cannot be recovered from a final-result envelope.

To inspect or claim a run's sandbox later, use its saved profile directly (substitute the run ID):

```sh
stripe --config .benchmark-secrets/stripe/<run-id>.toml payment_intents list --limit 20
stripe --config .benchmark-secrets/stripe/<run-id>.toml sandbox claim --non-interactive
```

## Inspect a completed suite

For an unattended serial suite in a dedicated clean worktree:

```sh
node scripts/run-suite.mjs --suite 20260906-minimal-inspector-high \
  --prompt prompt-minimal.md --effort high --timeout 7200
```

This runs all seven models in harness order, records private progress under `.benchmark-secrets/suites/<suite>/`, and invokes the live read-only inspector after all attempts. Published model failures do not stop later models; publication/cleanup failures pause the controller with artifacts preserved. Formatting warnings in archived model output do not block publication; secret checks remain mandatory. Run it under your normal persistent process supervisor for unattended operation. A sleeping/offline laptop can still interrupt network work. Completion means `awaiting-human-audit`, not an automatic passing score or viewer publication.

### Resume a blocked suite

Recover/publish any completed-but-unpublished attempt first, preserving its original bytes and metadata. Use `bash scripts/check-run-artifacts <run-id>` on the staged artifact before committing or publishing; never bypass secret checks. Restore the dedicated worktree to its original clean base branch without deleting unpublished evidence, then run:

```sh
node /path/to/committed-tooling/scripts/run-suite.mjs \
  --repo /path/to/original-suite-worktree \
  --suite 20260906-minimal-inspector-high \
  --prompt prompt-minimal.md --effort high --timeout 7200 --resume
```

Resume requires a blocked suite with no active attempt, a matching base/prompt/effort/timeout, an ordered list of saved attempts, and matching published metadata plus final/capture/event files for every skipped run. It never reruns a recorded attempt silently. Original failure exit codes remain in progress alongside recovered publication evidence. A controller lock rejects concurrent launches; if a process crashes, verify its `controller.lock/owner.json` PID is dead before manually removing only that lock. Uncertain in-flight attempts require explicit reconciliation, not blind resume.

The controller uses runner/inspector code beside its own script, while model inputs remain pinned to `--repo`. This permits a publication-only tooling repair without changing the comparison's base commit. Use a separate immutable tooling checkout for long runs; progress and new run metadata record its revision. Summary comparisons should disclose mid-suite tooling repairs.

```sh
git fetch origin benchmark-results
node scripts/run-inspector/inspect.mjs --suite 20260905-minimal-high --expected-runs 7
```

Offline by default. Produces a private versioned evidence report and reusable Markdown section, covering documentation use, frameworks, source review cues and run isolation. Add `--live` for read-only Stripe/Prodigi sandbox observations. See [inspector instructions](scripts/run-inspector/README.md) for artwork recovery, screenshot/favicon/social-preview staging, snapshot replay and safe summary updates. The inspector does not launch model runs, execute archived code, create orders/payments, assign ratings or publish viewer changes.

Tests (fake CLIs, local Git fixtures, mocked APIs; no model calls):

```sh
python3 -m pip install -r scripts/run-inspector/requirements.txt
node --test tests/*.test.mjs
bash tests/run-benchmark-test.sh
```

## Adapter contract

`scripts/adapters/codex` and `scripts/adapters/claude` receive `BENCHMARK_WORKSPACE`, `BENCHMARK_PROMPT_FILE`, `BENCHMARK_MODEL`, `BENCHMARK_FINAL_OUTPUT`, `BENCHMARK_USAGE_OUTPUT`, `BENCHMARK_CAPTURE_DIR`, `BENCHMARK_VERCEL_PROJECT`, `BENCHMARK_CLI_STATE` (path to the run's private Stripe CLI profile; named neutrally so the agent's choice of payment provider is not steered), and optional `BENCHMARK_REASONING_EFFORT`. New providers should implement the same contract, run without prompts, write only the final answer to `BENCHMARK_FINAL_OUTPUT`, and emit other output to stdout/stderr. Keep incremental raw records private in the capture directory; extend the normalizer and its tests before supporting a new event format. Use `--reasoning-effort` to pin an effort level and record it in metadata; omit it to retain each provider's default. Codex uses `exec --json`; Claude uses `--output-format stream-json --verbose`. Do not override capture-format flags through extra CLI arguments.

## Informal comparison

For a more useful informal comparison, pin the prompt and reference revisions, environment, timeout, reasoning effort, and credentials scope. Check deployed behavior and evidence—not self-reported success.
