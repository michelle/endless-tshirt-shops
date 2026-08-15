# endless-tshirt-shop benchmark

Benchmark coding agents against [`prompt.md`](prompt.md). A run starts with an empty `runs/<run-id>/workspace/`, preserves the generated app and completion report, and pushes a review branch.

## Prerequisites

```sh
# macOS
brew install stripe/stripe-cli/stripe vercel-cli coreutils
vercel login                         # the one interactive setup step
export SP_AUTH='scalable-press-test-key'
```

`SP_AUTH` must be a test key. `timeout` (Linux) or `gtimeout` (macOS Coreutils), Git, and an `origin` remote are required. For CI, use masked `SP_AUTH`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`; Vercel must be invoked with its token and `--yes`.

## Run

Commit or stash all existing work first: the runner refuses a dirty repository so each run has a reproducible base commit.

```sh
scripts/run-benchmark \
  --adapter codex \
  --model gpt-5.6-sol \
  --timeout 3600

scripts/run-benchmark \
  --adapter claude \
  --model sonnet \
  --run-id 20260812-claude-sonnet-a \
  -- --max-budget-usd 20
```

Example Codex models: `gpt-5.6-sol`, `gpt-5.6-terra`, and `gpt-5.6-luna`.
Claude Code accepts the stable aliases `sonnet`, `opus`, and `haiku`; its full
model IDs also work (for example, `claude-sonnet-5`). Use a pinned full ID when
you need an immutable model version for comparison.

The runner creates `benchmark/<run-id>` from the current branch, invokes the selected CLI non-interactively in an initially empty workspace, commits with `benchmark: <run-id> [<adapter>/<model>] <status>`, pushes to `origin`, and returns to the original branch. It creates and pushes failed or timed-out runs too. A failed push leaves the local run branch and commit intact, then exits nonzero.

Codex uses its non-interactive exec mode with automatic approvals. Claude uses print mode with bypassed permissions. Only run this on an externally controlled machine and with test credentials.

## Run contents

```text
runs/<run-id>/
  workspace/       generated application code
  final.md         agent's final completion report
  agent.log        redacted execution transcript
  metadata.json    model, adapter, base/prompt hashes, status, timing, URL
  agent.raw.log    untracked local source transcript
```

The runner redacts injected secret values and common Stripe/Vercel key formats before committing `agent.log`; it scans staged output and refuses to commit if known secrets remain. Raw logs stay untracked. Review the pushed `benchmark/<run-id>` branch rather than trusting the agent's report alone.

Run `tests/run-benchmark-test.sh` to verify the runner locally with fake CLIs and a temporary bare Git remote; it makes no network or model calls.

## Adapter contract

`scripts/adapters/codex` and `scripts/adapters/claude` receive `BENCHMARK_WORKSPACE`, `BENCHMARK_PROMPT_FILE`, `BENCHMARK_MODEL`, and `BENCHMARK_FINAL_OUTPUT`. New providers should implement the same contract, run without prompts, write only the final answer to `BENCHMARK_FINAL_OUTPUT`, and emit all other output to stdout/stderr.

## Fair comparison

Pin the prompt and reference revisions, environment, timeout, budget, credentials scope, and evaluator. Randomize order and run each model at least three times. Score deployed behavior and evidence—not self-reported success—using the rollout guidance in [`BENCHMARK_PLAN.md`](BENCHMARK_PLAN.md).
