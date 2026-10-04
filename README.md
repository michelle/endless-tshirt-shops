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
| `prompt-v4.md` | **Current.** Concept commitment plus provider-neutral deployment: deploying is required, but no hosting service is suggested. |
| `prompt-v3.md` | Any original theme, DTG-customised per customer; the agent picks its own payment provider and is directed to Vercel. |
| `prompt-v3-concept-commit.md` | Prompt v3 plus an immutable concept file required as the first tool action, before environment or account inspection. |
| `prompt-v2.md` | Any original theme. Predecessor to v3. |
| `prompt-minimal.md`, `prompt-beauty.md`, `prompt-unserious.md` | Rebuild [datetime.store](https://github.com/michelle/datetime.store) with Stripe and Prodigi, each changing one instruction. |
| `prompt-clean-sheet.md` | Any appealing theme, with datetime.store given only as an example. |

Only v2, v3 and v4 leave the payment provider to the agent, so the provider-neutral
environment described below matters only for those. The earlier prompts name
Stripe outright.

Suites that ran a since-removed prompt keep their exact archived copy at
`run_viewer/public/suites/<suite-id>/prompt.md`, hash-checked against the run
metadata, so historical runs stay reproducible.

## Setup

```sh
brew install stripe/stripe-cli/stripe vercel-cli coreutils   # macOS
export PRODIGI_API_KEY='test_00000000-0000-0000-0000-000000000000'
export BENCHMARK_VERCEL_TOKEN='token-used-only-after-the-agent-exits'
```

`PRODIGI_API_KEY` must be a sandbox key, and the suite controller checks its
shape. Do not run `vercel login` for prompt v4: the agent is meant to encounter
an unauthenticated CLI and choose its own deployment route. The harness uses
`BENCHMARK_VERCEL_TOKEN` only for its later inspection copy. Also required:
Node.js 20.11+ (the viewer in `run_viewer/` needs 22.13+),
Git, an `origin` remote, and `timeout`/`gtimeout`. The inspector additionally
needs Python 3 with Pillow.

Every provider CLI must be runnable as a bare command, since `run-agent.mjs`
spawns it by name: a CLI installed outside `PATH`, such as Kimi Code's
`~/.kimi-code/bin/kimi`, needs a symlink or a `PATH` entry or its runs die at
launch.

### Preflight

```sh
node scripts/preflight-clis.mjs            # resolve CLIs, check every alias
node scripts/preflight-clis.mjs --route    # also confirm each alias routes
```

The tests run against fake CLIs, so they cannot catch a renamed flag, a binary
missing from `PATH`, a retired model alias, an absent variant or a region the
account cannot reach. Run the preflight before a suite: `--route` spends one
two-word completion per alias, which is nothing against an hour-long run, and
is the only way to confirm an alias and its variant actually resolve.

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

`--adapter` is `codex`, `claude`, `kimi` or `opencode`; `--reasoning-effort` is `low`, `medium`,
`high`, `xhigh` or `max`, and is recorded in metadata (omit it to keep the
provider default). Neither the Kimi nor the OpenCode CLI has an effort flag, so
for those two it is recorded but never passed on. OpenCode instead carries
effort as a variant inside the model alias — `opencode/glm-5.3#high` — and only
some models publish one, so `--reasoning-effort` and an OpenCode alias's
variant are set independently and can disagree; the alias is what actually ran.
Arguments after `--` go to the underlying CLI, e.g. `-- --max-budget-usd 20`.
`--suite-id` groups the runs of one comparison.

The provider CLI's own version is recorded as `cli_version`, because it is part
of the harness: a Codex below 0.157.1 is refused `gpt-6-sol` and `gpt-6-luna`
outright, with an error that blames the ChatGPT account rather than the client
version. Two runs of the same model are comparable only when this matches.

The runner commits one immutable `runs/<run-id>/` to `benchmark-results`,
pushes it, and returns to the original branch. Failed and timed-out runs are
recorded too. Earlier suites compared `gpt-6-astra`, `gpt-5.6-sol`,
`gpt-5.6-terra`, `gpt-5.6-luna`, `claude-fable-5-1`, `claude-opus-5` and
`claude-sonnet-5`; those runs stay published on `benchmark-results`.

`scripts/run-suite.mjs` now iterates the open-weights comparison:
`kimi-code/kimi-for-coding`, `kimi-code/k3`, `opencode/glm-5.3#high`,
`opencode/deepseek-v4-pro#high`, `opencode/qwen3.8-max`,
`opencode/minimax-m3` and `opencode/kimi-k3`. That list is the suite's
definition, so `--resume` verifies against it: freeze it before a launch and
change it only between suites. `kimi-code/k3` and `opencode/kimi-k3` are the
same weights on two harnesses — the pair is the control that separates
scaffold effect from model effect.

Two generated paths never publish. `scripts/exclude-bulky-artifacts.mjs` keeps
dependency and build directories, and any single file at or above 90 MB, out of
the staged tree, recording each one in `metadata.excluded_paths`. The runner
already strips these when copying the agent workspace, but `minimax-m3` shipped
no `.gitignore` and its `node_modules` reached the index anyway, where a 109.6 MB
binary made GitHub refuse the push after the run had been paid for. This is a
second line of defence at the layer that decides what gets committed.

A run whose stream ends mid-thought leaves no URL in `final.md` even though it
deployed — `glm-5.3` shipped a working store and published `deployment_url` `""`.
When the report names none, every `vercel.app` host the private log saw is
recorded in `deployment_url_candidates`. That is deliberately a list, not a
guess: agents probe unrelated hosts, one of them a known-nonexistent domain used
as a control, so picking automatically would publish a confident wrong answer.

Prompt v4 requires an exact final `DEPLOYMENT_URL:` line, allowing non-Vercel
hosts to be recorded without guessing from arbitrary URLs in the transcript.
After the agent exits, the harness can independently deploy the captured source
to a run-specific Vercel project when `BENCHMARK_VERCEL_TOKEN` is set. The token
is removed before the agent starts. Metadata records the agent deployment and
the evaluator-owned inspection deployment separately; the latter never rescues
the former's benchmark result. `BENCHMARK_VERCEL_SCOPE` is optional. Private
deployment logs live under `.benchmark-secrets/deployments/`.

OpenCode's `opencode-go/*` aliases reach the same models but require Global
regions on the workspace's OpenCode Console privacy settings; without that they
fail with `provider.invalid-request` on the first request, so the plain
`opencode/*` aliases are what the suite uses.

### Run a whole suite

```sh
node scripts/run-suite.mjs --suite 20260927-openweights-high \
  --prompt prompts/prompt-v3.md --effort high --timeout 7200
```

Runs every model in the list serially in a dedicated clean worktree, records private
progress under `.benchmark-secrets/suites/<suite>/`, and invokes the inspector
at the end. Like the runner, it requires `--prompt`: neither tool has a
default, so a run can never inherit a task nobody chose.
A model failure does not stop later models; a publication or cleanup failure
pauses the controller with artifacts preserved. A credential an agent copied
into its workspace no longer causes that pause: `scripts/redact-run-secrets.mjs`
replaces the values this run provisioned before the gate sees them (see
Redaction below). Launch it under a persistent
process supervisor. Finishing means `awaiting-human-audit`, not a passing score.

To continue a blocked suite, first recover any completed-but-unpublished
attempt (check it with `bash scripts/check-run-artifacts <run-id>`, never bypass
the secret scan), restore the worktree to its clean base branch, then add
`--resume`. Resume re-verifies every skipped run's published metadata against
the original base, prompt and effort; it never silently reruns a recorded
attempt. A controller lock rejects concurrent launches.

### Ambient-leakage experiment

`prompts/prompt-v3-concept-commit.md` and `prompts/prompt-v4.md` ask the model to write an immutable
`concept-commitment.json` as its first tool action, before inspecting files,
environment variables, the network or provider accounts. Validate the file in
a completed workspace with:

```sh
node scripts/check-concept-commitment.mjs runs/<run-id>/workspace
```

The private raw transcript is still the authority for whether the write really
was the first tool call. Audit preserved transcripts without printing command
text or credentials with:

```sh
node scripts/audit-ambient-leakage.mjs > .benchmark-secrets/ambient-audit.json
```

The default scan includes transcripts retained inside dedicated suite
worktrees under `.benchmark-secrets/worktrees/`, plus transcripts and
recoveries belonging to the main checkout.

The audit reports hashes of suspicious tool inputs and distinguishes references
to foreign run artifacts from a run's own workspace. A hit proves access, not
influence; a unique canary copied into the committed concept supplies the
stronger causal evidence.

## What a run records

```text
runs/<run-id>/
  workspace/      generated application code
  final.md        the agent's completion report
  events.jsonl    normalized tool and web events (no raw inputs or results)
  capture.json    capture coverage, warnings, schema version
  metadata.json   suite, prompt + hash, model, effort, CLI version, usage, redactions,
                  excluded paths, tree hashes, status, timing, URL + candidates
  usage.json      provider-reported token usage
```

`events.jsonl` keeps tool names, lifecycle status, topic tags, allowlisted
documentation URL paths and hashed search queries — not commands, query text or
tool results. Those stay in a private, permissions-protected transcript at
`.benchmark-secrets/transcripts/<run-id>/`, which can contain credentials and
customer data: never publish it, and note there is no automatic expiry. Review
artifacts before republishing them; the staged secret scan guards generated
source and reports, but it is not a general PII detector.

### Redaction

Agents copy the payment credentials they were handed into their own workspace
often enough that it has to be handled, not treated as an exception:
`deepseek-v4-pro` wrote both Stripe keys to `.stripe_sk` and `.stripe_pk`, and
`kimi-for-coding` wrote a sandbox key to `.stripe-account` and a webhook secret
to `.stripe-webhook-secret`. Publishing those is out of the question, and
refusing the commit blocks the run and pauses the whole suite, so
`scripts/redact-run-secrets.mjs` runs first and replaces them with
`REDACTED_BUILD_PLACEHOLDER`. Each original is preserved at
`.benchmark-secrets/recoveries/<run-id>/<path>.original` (owner-only), and
`metadata.json` lists every substitution in `redactions`, naming the file and
which credential it held — so the leak stays visible as a finding about the
agent rather than becoming a missing run.

It makes two passes with deliberately different reach:

- **By value**, anywhere in the run directory: the harness's own environment
  variables and the Stripe profile that run provisioned.
- **By shape**, only in `workspace/` and `final.md`: anything matching a
  payment-credential shape, using the same pattern and the same 24-character
  floor as `scripts/check-run-artifacts` — so placeholders like `sk_test_xxx`
  in generated docs and tests survive untouched.

The shape pass exists because the credentials that actually leak are minted
during the run: `stripe sandbox create` issues its own keys and `stripe listen`
its own webhook secret, so they appear in no file the harness wrote and no
by-value pass can see them.

Restricting the shape pass to agent-authored files is what keeps the gate
meaningful. A payment-shaped value in `metadata.json`, `events.jsonl` or
`capture.json` would mean the harness itself leaked one — a bug, not an agent
behaviour — so those are left for `scripts/check-run-artifacts` to block. The
gate is unchanged and still fails closed there. The private raw CLI log keeps its
original bytes, since it is never published.

## Run isolation

The provider process starts in a new empty temporary workspace. Its real cwd,
`PWD`, and `INIT_CWD` all name that directory; runner-only paths for the source
prompt, transcript capture, final response, and usage data are withheld from
the provider environment. Those control files live in a second private
temporary directory. After the provider exits, the harness copies the generated
workspace into `runs/<run-id>/workspace/`, finalizes the public artifacts, and
moves the private transcript into `.benchmark-secrets/transcripts/<run-id>/`.
Interrupted runs archive any partial transcript during cleanup.

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

All four harnesses run non-interactively with memory features explicitly
disabled — Codex via `exec --json` with ephemeral sessions, Claude via
`--output-format stream-json` with session persistence and all `CLAUDE.md`
loading turned off, Kimi via `kimi -p --output-format stream-json` with a
fresh `KIMI_CODE_HOME` inside the run's private capture directory: auth and
provider config are copied from the operator's home (`KIMI_CODE_HOME` when
set, else `~/.kimi-code`) so the run can log in, but no session, history or
memory carries over between runs.

Auth is the one deliberate exception, and it is not optional. Kimi refreshes its
OAuth token mid-run and the provider rotates the refresh token when it does, so
the copy inside the isolated home becomes the only valid credential. Leaving it
there breaks the operator's own login — and, because each run copies its
credentials from that home, every later Kimi run in the suite. `run-agent.mjs`
therefore writes a refreshed credential back, and only when it carries a
non-empty refresh token: a failed refresh leaves the fields blank, and promoting
that would cause the very breakage this prevents. A suite with more than one
Kimi model depends on this. Kimi's stream-json format reports no token usage, so Kimi
runs publish no `usage.json` and record `"usage": null`. Since the CLI has no
effort flag, Kimi models run at their provider-default effort (`max` for
`kimi-for-coding`, `high` for `k3`) regardless of `--reasoning-effort`; the
requested value is still recorded in metadata.

OpenCode (`opencode run --standalone --auto --format json -m provider/model[#variant]`)
creates a fresh session per run and answers permission asks itself — questions and plan
transitions are denied outright in non-interactive mode — so it never
prompts, but it keeps its session records in the operator's global opencode
state directory rather than the capture directory, the same trust domain as
the other CLIs' own session stores. `--standalone` gives each run a private
server: the shared background service is reachable from any other `opencode`
command on the machine, and a session it drops surfaces only as
`aborted: Session interrupted: shutdown`, indistinguishable from the agent
giving up. Usage comes from every `step_finish`
event and is summed into `usage.json`, with fresh input computed per step so
re-counted cache volume does not drown it. Some models emit no `step_finish` at
all, and those runs publish no `usage.json` the way Kimi runs do not. One sharp
edge: `opencode run`
exits non-zero when *any* `session.error` fired during the run — including a
transient stream hiccup the agent recovered from — so a run can record
`failed` even with a complete, deployed deliverable in `final.md`.

## Inspect a suite

```sh
git fetch origin benchmark-results
node scripts/run-inspector/inspect.mjs --suite 20260927-openweights-high --expected-runs 7
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
`BENCHMARK_CLI_STATE` and optionally `BENCHMARK_VERCEL_PROJECT` and
`BENCHMARK_REASONING_EFFORT`, and refuses to start if any of the first six is
missing. `BENCHMARK_CLI_STATE` is named neutrally on purpose, so it does not
steer the agent's choice of payment provider. `BENCHMARK_VERCEL_PROJECT` is
present only when the selected prompt explicitly names it; prompt v4 therefore
gets no Vercel hint from the environment.

Each additional provider means editing four places, not adding a plugin:

1. `run-agent.mjs` — the CLI name and the arguments that make it run
   non-interactively, with memory disabled, emitting a JSON event stream.
2. `scripts/run-inspector/transcript.mjs` — how to normalize that stream, with
   tests, before any run in the new format is published.
3. `scripts/run-benchmark` — the `--adapter` validation.
4. `scripts/preflight-clis.mjs` — its version probe, the command that lists its
   aliases if it has one, and the routing arguments, which must mirror the
   launch arguments in `run-agent.mjs` or the preflight stops being evidence.

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
