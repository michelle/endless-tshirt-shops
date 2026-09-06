# endless-tshirt-shop benchmark

Informally benchmark coding agents against [`prompt.md`](prompt.md). A run starts with an empty workspace, preserves the generated app and completion report under `runs/<run-id>/`, and appends it to the shared `benchmark-results` branch.

## Prerequisites

```sh
# macOS
brew install stripe/stripe-cli/stripe vercel-cli coreutils
vercel login                         # the one interactive setup step
export PRODIGI_API_KEY='prodigi-test-key'
```

`PRODIGI_API_KEY` should be a sandbox/test key. `timeout` (Linux) or `gtimeout` (macOS Coreutils), Git, and an `origin` remote are required. For CI, use masked `PRODIGI_API_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`; Vercel must be invoked with its token and `--yes`.

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

The runner invokes the selected CLI non-interactively in an initially empty workspace, commits one immutable `runs/<run-id>/` result to `benchmark-results`, pushes it to `origin`, and returns to the original branch. It records failed or timed-out runs too. `--prompt-file` selects a regular prompt file inside the repository and defaults to `prompt.md`; the selected path and content hash are recorded in metadata. `--suite-id` records a shared identifier for grouping related attempts. Each run receives a unique Vercel project name, `benchmark-<run-id>`, through `$BENCHMARK_VERCEL_PROJECT`, so its deployment cannot replace another run's deployment. It also gives every agent an isolated Stripe CLI config and transparently applies it to every `stripe` command, including commands launched through a login shell. While the agent runs, the normal global Stripe config is atomically quarantined and ambient Stripe credential variables are unset; the global config is restored afterward on success, failure, or timeout. A config written directly to the global path is captured under `.benchmark-secrets/stripe/` before restoration. The run config remains locally at `.benchmark-secrets/stripe/<run-id>.toml`, is permissions-protected and ignored by Git, and is not created or claimed by the runner—the agent does that itself. Temporary execution branches remain local and are removed after a successful push. Review and compare all artifacts together on `benchmark-results`. A failed push leaves the local publication branch and commit intact, then exits nonzero.

Codex uses its non-interactive exec mode with automatic approvals. Claude uses print mode with bypassed permissions. Run this only in an isolated, externally sandboxed environment and with test-only credentials.

## Run contents

These files are committed under `runs/<run-id>/` on `benchmark-results`.

```text
runs/<run-id>/
  workspace/       generated application code
  final.md         agent's final completion report
  agent.log        redacted execution transcript
  metadata.json    suite, prompt, model, effort, usage, base/tree hashes, status, timing, URL
  usage.json       provider-reported token usage, including normalized new-input tokens when available
  agent.raw.log    untracked local source transcript
```

The runner redacts injected secret values and common Stripe/Vercel key formats before committing `agent.log`; it scans staged output and refuses to commit if known secrets remain. Raw logs stay untracked. Review the pushed `benchmark/<run-id>` branch rather than trusting the agent's report alone.

To inspect or claim a run's sandbox later, use its saved profile directly (substitute the run ID):

```sh
stripe --config .benchmark-secrets/stripe/<run-id>.toml payment_intents list --limit 20
stripe --config .benchmark-secrets/stripe/<run-id>.toml sandbox claim --non-interactive
```

Run `tests/run-benchmark-test.sh` to verify the runner locally with fake CLIs and a temporary bare Git remote; it makes no network or model calls.

## Adapter contract

`scripts/adapters/codex` and `scripts/adapters/claude` receive `BENCHMARK_WORKSPACE`, `BENCHMARK_PROMPT_FILE`, `BENCHMARK_MODEL`, `BENCHMARK_FINAL_OUTPUT`, `BENCHMARK_VERCEL_PROJECT`, `BENCHMARK_STRIPE_CONFIG`, and optional `BENCHMARK_REASONING_EFFORT`. New providers should implement the same contract, run without prompts, write only the final answer to `BENCHMARK_FINAL_OUTPUT`, and emit all other output to stdout/stderr. Use `--reasoning-effort` to pin an effort level and record it in metadata; omit it to retain each provider's default.

## Informal comparison

For a more useful informal comparison, pin the prompt and reference revisions, environment, timeout, reasoning effort, and credentials scope. Check deployed behavior and evidence—not self-reported success.
