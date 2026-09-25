# endless tshirt shops

An informal benchmark: give a coding agent an empty directory and a prompt
asking it to build and deploy a working t-shirt store, then check what it
actually shipped rather than what it claimed.

**[Browse the results →](https://michelle.github.io/endless-tshirt-shops/)**

Each run is preserved under `runs/<run-id>/` on the `benchmark-results` branch:
the generated app, the agent's completion report, and a redacted event log.
Results are directional case studies, not a ranking.

## Prompts

Every prompt lives in [`prompts/`](prompts). The runner has no default: each
run names its prompt, and records the path and its SHA-256 in metadata.

| File | Task |
| --- | --- |
| `prompt-v3.md` | **Current.** Any original theme, DTG-customised per customer; the agent picks its own payment provider. |
| `prompt-v2.md` | Any original theme. Predecessor to v3. |
| `prompt-minimal.md`, `prompt-beauty.md`, `prompt-unserious.md` | Rebuild [datetime.store](https://github.com/michelle/datetime.store) with Stripe and Prodigi, each changing one instruction. |
| `prompt-clean-sheet.md` | Any appealing theme, with datetime.store given only as an example. |

Only v2 and v3 leave the payment provider to the agent, so the provider-neutral
environment described below matters only for those. The earlier prompts name
Stripe outright.

Suites that ran a since-removed prompt keep their exact archived copy at
`run_viewer/public/suites/<suite-id>/prompt.md`, hash-checked against the run
metadata, so historical runs stay reproducible.

## Setup

```sh
brew install stripe/stripe-cli/stripe vercel-cli coreutils   # macOS
vercel login                                                  # the one interactive step
export PRODIGI_API_KEY='test_00000000-0000-0000-0000-000000000000'
```

`PRODIGI_API_KEY` must be a sandbox key, and the suite controller checks its
shape. Also required: Node.js 20.11+ (the viewer in `run_viewer/` needs 22.13+),
Git, an `origin` remote, and `timeout`/`gtimeout`. The inspector additionally
needs Python 3 with Pillow.

Run this only in an isolated environment, with test-only credentials.

## Run one model

The runner refuses a dirty repository, so commit or stash first.

```sh
scripts/run-benchmark \
  --adapter codex --model gpt-6-astra \
  --suite-id 20260911-prompt-v3-high \
  --run-id 20260911-prompt-v3-high-codex-gpt-6-astra \
  --prompt-file prompts/prompt-v3.md \
  --reasoning-effort high --timeout 3600
```

`--adapter` is `codex`, `claude` or `kimi`; `--reasoning-effort` is `low`, `medium`,
`high`, `xhigh` or `max`, and is recorded in metadata (omit it to keep the
provider default; Kimi's CLI has no effort flag, so for `kimi` it is recorded
but not passed on). Arguments after `--` go to the underlying CLI, e.g.
`-- --max-budget-usd 20`. `--suite-id` groups the runs of one comparison.

The runner commits one immutable `runs/<run-id>/` to `benchmark-results`,
pushes it, and returns to the original branch. Failed and timed-out runs are
recorded too. The models compared so far are `gpt-6-astra`, `gpt-5.6-sol`,
`gpt-5.6-terra`, `gpt-5.6-luna`, `claude-fable-5-1`, `claude-opus-5`,
`claude-sonnet-5`, `kimi-code/kimi-for-coding` and `kimi-code/k3` — the same
list `scripts/run-suite.mjs` iterates.

### Run a whole suite

```sh
node scripts/run-suite.mjs --suite 20260911-prompt-v3-high \
  --prompt prompts/prompt-v3.md --effort high --timeout 7200
```

Runs all nine models serially in a dedicated clean worktree, records private
progress under `.benchmark-secrets/suites/<suite>/`, and invokes the inspector
at the end. Like the runner, it requires `--prompt`: neither tool has a
default, so a run can never inherit a task nobody chose.
A model failure does not stop later models; a publication or cleanup failure
pauses the controller with artifacts preserved. Launch it under a persistent
process supervisor. Finishing means `awaiting-human-audit`, not a passing score.

To continue a blocked suite, first recover any completed-but-unpublished
attempt (check it with `bash scripts/check-run-artifacts <run-id>`, never bypass
the secret scan), restore the worktree to its clean base branch, then add
`--resume`. Resume re-verifies every skipped run's published metadata against
the original base, prompt and effort; it never silently reruns a recorded
attempt. A controller lock rejects concurrent launches.

## What a run records

```text
runs/<run-id>/
  workspace/      generated application code
  final.md        the agent's completion report
  events.jsonl    normalized tool and web events (no raw inputs or results)
  capture.json    capture coverage, warnings, schema version
  metadata.json   suite, prompt + hash, model, effort, usage, tree hashes, status, timing, URL
  usage.json      provider-reported token usage
```

`events.jsonl` keeps tool names, lifecycle status, topic tags, allowlisted
documentation URL paths and hashed search queries — not commands, query text or
tool results. Those stay in a private, permissions-protected transcript at
`.benchmark-secrets/transcripts/<run-id>/`, which can contain credentials and
customer data: never publish it, and note there is no automatic expiry. Review
artifacts before republishing them; the staged secret scan guards generated
source and reports, but it is not a general PII detector.

## Run isolation

Each run gets its own Vercel project (`benchmark-<run-id>`) and its own Stripe
CLI profile in a private temporary directory, handed over as
`BENCHMARK_CLI_STATE` and transparently applied to every `stripe` command,
including through a login shell. The profile is archived afterwards to
`.benchmark-secrets/stripe/<run-id>.toml`, which is Git-ignored. During the run
the normal global Stripe config is quarantined and ambient Stripe variables are
unset; a config the agent writes to the global path is captured too.

For v2/v3 the environment is deliberately provider-neutral: no variable name or
value, `PATH` entry or `BASH_ENV` path reveals which payment provider is
prepared, and `tests/run-benchmark-test.sh` asserts that. The agent has to find
the CLI by probing for it.

**This is not a sandbox.** The agent runs as the invoking user and can still
reach the archive, this repository, `$HOME` and `/tmp` with an explicit search.
Treat isolation as advisory; use a dedicated user account or container if it
matters.

All three providers run non-interactively with memory features explicitly
disabled — Codex via `exec --json` with ephemeral sessions, Claude via
`--output-format stream-json` with session persistence and all `CLAUDE.md`
loading turned off, Kimi via `kimi -p --output-format stream-json` with a
fresh `KIMI_CODE_HOME` inside the run's private capture directory: auth and
provider config are copied from the operator's home (`KIMI_CODE_HOME` when
set, else `~/.kimi-code`) so the run can log in, but no session, history or
memory carries over between runs, and a mid-run token refresh can rewrite
only the copies. Kimi's stream-json format reports no token usage, so Kimi
runs publish no `usage.json` and record `"usage": null`. Since the CLI has no
effort flag, Kimi models run at their provider-default effort (`max` for
`kimi-for-coding`, `high` for `k3`) regardless of `--reasoning-effort`; the
requested value is still recorded in metadata.

## Inspect a suite

```sh
git fetch origin benchmark-results
node scripts/run-inspector/inspect.mjs --suite 20260911-prompt-v3-high --expected-runs 9
```

Offline by default; `--live` adds read-only Stripe and Prodigi sandbox
observations. It produces a private, review-required evidence report covering
documentation use, frameworks, source cues and isolation. It does not launch
runs, execute archived code, create orders, score runs or publish anything.
See [`scripts/run-inspector/README.md`](scripts/run-inspector/README.md) for
artwork recovery, capture staging and summary updates.

## Tests

No model calls: fake CLIs, local Git fixtures and mocked APIs.

```sh
python3 -m pip install -r scripts/run-inspector/requirements.txt
node --test tests/*.test.mjs
bash tests/run-benchmark-test.sh
```

## Adding a provider

`scripts/run-agent.mjs` launches the chosen CLI for one run. It receives
`BENCHMARK_WORKSPACE`, `BENCHMARK_PROMPT_FILE`, `BENCHMARK_MODEL`,
`BENCHMARK_FINAL_OUTPUT`, `BENCHMARK_USAGE_OUTPUT`, `BENCHMARK_CAPTURE_DIR`,
`BENCHMARK_VERCEL_PROJECT`, `BENCHMARK_CLI_STATE` and optionally
`BENCHMARK_REASONING_EFFORT`, and refuses to start if any of the first six is
missing. `BENCHMARK_CLI_STATE` is named neutrally on purpose, so it does not
steer the agent's choice of payment provider.

Each additional provider means editing three places, not adding a plugin:

1. `run-agent.mjs` — the CLI name and the arguments that make it run
   non-interactively, with memory disabled, emitting a JSON event stream.
2. `scripts/run-inspector/transcript.mjs` — how to normalize that stream, with
   tests, before any run in the new format is published.
3. `scripts/run-benchmark` — the `--adapter` validation.

The CLI must run without prompting, write only its final answer to
`BENCHMARK_FINAL_OUTPUT`, send everything else to stdout/stderr, and keep raw
records inside the capture directory. Do not override the capture-format flags
through extra CLI arguments.

`run-agent.mjs` records the raw stream and decides the run's outcome; it writes
no public artifacts. `scripts/run-inspector/finalize-capture.mjs` runs
afterwards and is the sole writer of `final.md`, `events.jsonl`, `capture.json`
and `usage.json`, so a timed-out or killed CLI still produces them.

## Comparing fairly

Pin the prompt and reference revisions, environment, timeout, reasoning effort
and credential scope. Check deployed behaviour and evidence, not self-reported
success.
