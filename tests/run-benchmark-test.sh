#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
TMP_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/benchmark-runner-test.XXXXXX")
trap 'rm -rf "$TMP_ROOT"' EXIT

fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
assert() { "$@" || fail "$*"; }

REPO="$TMP_ROOT/repo"
REMOTE="$TMP_ROOT/remote.git"
BIN="$TMP_ROOT/bin"
BIN_WITHOUT_TIMEOUT="$TMP_ROOT/bin-without-timeout"
GLOBAL_STRIPE_CONFIG="$TMP_ROOT/global-stripe/config.toml"
mkdir -p "$REPO" "$BIN" "$BIN_WITHOUT_TIMEOUT" "$(dirname "$GLOBAL_STRIPE_CONFIG")"
export FAKE_VERCEL_STATE="$TMP_ROOT/fake-vercel-project"
printf 'original global Stripe config\n' >"$GLOBAL_STRIPE_CONFIG"
export BENCHMARK_GLOBAL_STRIPE_CONFIG="$GLOBAL_STRIPE_CONFIG"
# Visible to the fake agent so it can assert no sibling run's profile is readable.
export FAKE_ARCHIVE_DIR="$REPO/.benchmark-secrets/stripe"
git init -q -b main "$REPO"
git -C "$REPO" config user.email benchmark-test@example.com
git -C "$REPO" config user.name benchmark-test
mkdir -p "$REPO/prompts"
printf 'test prompt using $BENCHMARK_VERCEL_PROJECT\n' >"$REPO/prompts/prompt.md"
printf 'beauty prompt using $BENCHMARK_VERCEL_PROJECT\n' >"$REPO/prompts/prompt-beauty.md"
printf 'provider choice prompt\n' >"$REPO/prompts/prompt-v4.md"
printf 'runs/*/agent.raw.log\n.benchmark-secrets/\n' >"$REPO/.gitignore"
git -C "$REPO" add prompts .gitignore
git -C "$REPO" commit -qm baseline
git init -q --bare "$REMOTE"
git -C "$REPO" remote add origin "$REMOTE"
git -C "$REPO" push -qu origin main

printf '%s\n' \
  '#!/usr/bin/env bash' \
  'shift' \
  'exec "$@"' >"$BIN/timeout"
chmod +x "$BIN/timeout"

printf '%s\n' \
  '#!/usr/bin/env bash' \
  'set -euo pipefail' \
  'if [[ ${1-} == --version ]]; then echo "fake-cli 9.9.9"; exit 0; fi' \
  '[[ $1 == --config ]]' \
  '[[ $2 == "$BENCHMARK_CLI_STATE" ]]' \
  'printf "fake Stripe profile\\n" >>"$BENCHMARK_CLI_STATE"' >"$BIN/stripe"
chmod +x "$BIN/stripe"

printf '%s\n' \
  '#!/usr/bin/env bash' \
  'set -euo pipefail' \
  'if [[ ${1-} == --version ]]; then echo "fake-cli 9.9.9"; exit 0; fi' \
  'output=' \
  'workspace=' \
  'while (($#)); do' \
  '  case $1 in' \
  '    --output-last-message) output=$2; shift 2 ;;' \
  '    --cd) workspace=$2; shift 2 ;;' \
  '    *) shift ;;' \
  '  esac' \
  'done' \
  'case $(/bin/bash -lc "command -v stripe") in *benchmark-tools.*/stripe) ;; *) exit 9 ;; esac' \
  '[[ -z "${STRIPE_SECRET_KEY-}${STRIPE_API_KEY-}${STRIPE_PUBLISHABLE_KEY-}${STRIPE_WEBHOOK_SECRET-}" ]]' \
  '[[ -z "${VERCEL_TOKEN-}${BENCHMARK_VERCEL_TOKEN-}${BENCHMARK_VERCEL_SCOPE-}" ]]' \
  '# the environment must not disclose the pre-provisioned payment provider' \
  'if env | grep -i "^BENCHMARK_" | grep -qi stripe; then echo "provider name leaked through BENCHMARK_* environment" >&2; exit 10; fi' \
  'case $PATH$BASH_ENV in *[Ss]tripe*) echo "provider name leaked through PATH/BASH_ENV" >&2; exit 11 ;; esac' \
  '# the profile handed to the agent must be private: its directory holds only' \
  '# this run.s config, so dirname cannot walk to another run.s credentials' \
  'state_dir=$(dirname "$BENCHMARK_CLI_STATE")' \
  'if [[ $state_dir == "${FAKE_ARCHIVE_DIR-/nonexistent}" ]]; then echo "CLI profile lives in the shared archive" >&2; exit 12; fi' \
  'if [[ $(find "$state_dir" -type f | wc -l) -ne 1 ]]; then echo "sibling files reachable from the CLI profile directory" >&2; exit 13; fi' \
  'if [[ -n "${FAKE_GLOBAL_STRIPE_PATH:-}" ]]; then mkdir -p "$(dirname "$FAKE_GLOBAL_STRIPE_PATH")"; printf "test_mode_api_key = '\''sk_test_bypass_marker'\''\n" >"$FAKE_GLOBAL_STRIPE_PATH"; fi' \
  '[[ -n "${FAKE_CODEX_SLEEP:-}" ]] && sleep "$FAKE_CODEX_SLEEP"' \
  '[[ -n "${FAKE_ROOT_WRITE_PATH:-}" ]] && printf "outside workspace\n" >"$FAKE_ROOT_WRITE_PATH"' \
  'mkdir -p "$workspace"' \
  'git init -q "$workspace"' \
  'stripe sandbox create --non-interactive' \
  'app_dir=$workspace' \
  'if [[ -n "${FAKE_NESTED_APP:-}" ]]; then app_dir=$workspace/store; mkdir -p "$app_dir"; printf "{}\n" >"$app_dir/package.json"; fi' \
  'printf "%s\n" "${BENCHMARK_VERCEL_PROJECT-}" >"$app_dir/vercel-project.txt"' \
  'printf "node_modules\n" >"$app_dir/.gitignore"' \
  'mkdir -p "$app_dir/node_modules"' \
  'printf "generated dependency\n" >"$app_dir/node_modules/example.js"' \
  'printf "generated app\n" >"$app_dir/app.txt"' \
  '# some agents persist the credentials they were handed into their workspace' \
  '[[ -n "${FAKE_LEAK_PATH:-}" ]] && printf "PRODIGI=%s\n" "$PRODIGI_API_KEY" >"$workspace/$FAKE_LEAK_PATH"' \
  'mkdir -p "$workspace/public/fonts"; printf "vendor license  \r\nunchanged  \r\n" >"$workspace/public/fonts/OFL.txt"' \
  'printf "formatted CLI output  \n"' \
  "printf '%s\\n' '{\"type\":\"turn.completed\",\"usage\":{\"input_tokens\":11,\"output_tokens\":7,\"total_tokens\":18}}'" \
  'printf "PRODIGI_API_KEY=%s sk_test_abcdefghijklmnop rkcs_test_abcdefghijklmnop https://example.vercel.app\n" "$PRODIGI_API_KEY"' \
  'printf "final report\n" >"$output"' \
  'if [[ -n "${FAKE_DEPLOYMENT_URL:-}" ]]; then' \
  '  printf "Live site: %s/shop\n" "$FAKE_DEPLOYMENT_URL" >>"$output"' \
  'else' \
  '  printf "Deployed: **[Shop](https://benchmark-fake-store.vercel.app)**\n" >>"$output"' \
  '  printf "Webhook: `https://benchmark-fake-store.vercel.app/api/webhooks/stripe`\n" >>"$output"' \
  'fi' \
  'exit "${FAKE_CODEX_EXIT:-0}"' >"$BIN/codex"
chmod +x "$BIN/codex"

printf '%s\n' \
  '#!/usr/bin/env bash' \
  'set -euo pipefail' \
  '[[ ${VERCEL_TOKEN-} == fixture-harness-token ]]' \
  '[[ -z "${FAKE_VERCEL_EXPECTED_CWD:-}" || $PWD == *"/$FAKE_VERCEL_EXPECTED_CWD" ]]' \
  'case "${1-} ${2-}" in' \
  '  "project inspect") [[ -f $FAKE_VERCEL_STATE ]] ;;' \
  '  "project add") touch "$FAKE_VERCEL_STATE" ;;' \
  '  "project protection") [[ ${3-} == disable && ${5-} == --sso ]]; touch "$FAKE_VERCEL_STATE.public" ;;' \
  '  "deploy --prod") [[ -f $FAKE_VERCEL_STATE && -f $FAKE_VERCEL_STATE.public ]]; printf "https://benchmark-inspection-copy.vercel.app\n" ;;' \
  '  *) echo "unexpected Vercel invocation: $*" >&2; exit 2 ;;' \
  'esac' >"$BIN/vercel"
chmod +x "$BIN/vercel"
ln -s "$BIN/codex" "$BIN_WITHOUT_TIMEOUT/codex"

printf '%s\n' \
  '#!/usr/bin/env bash' \
  'set -euo pipefail' \
  'if [[ ${1-} == --version ]]; then echo "fake-cli 9.9.9"; exit 0; fi' \
  'printf "claude app\\n" > claude.txt' \
  "printf '%s\\n' '{\"type\":\"assistant\",\"message\":{\"content\":[{\"type\":\"tool_use\",\"id\":\"search1\",\"name\":\"WebSearch\",\"input\":{\"query\":\"stripe docs private@example.com\"}}]}}'" \
  "printf '%s\\n' '{\"type\":\"result\",\"result\":\"claude final report\",\"usage\":{\"input_tokens\":21,\"output_tokens\":13}}'" >"$BIN/claude"
chmod +x "$BIN/claude"

printf '%s\n' \
  '#!/usr/bin/env bash' \
  'set -euo pipefail' \
  'if [[ ${1-} == --version ]]; then echo "fake-cli 9.9.9"; exit 0; fi' \
  'prompt=' \
  'while (($#)); do' \
  '  case $1 in' \
  '    -p) prompt=$2; shift 2 ;;' \
  '    -m|--output-format) shift 2 ;;' \
  '    *) shift ;;' \
  '  esac' \
  'done' \
  '[[ -n $prompt ]]' \
  '# the harness must isolate Kimi: a fresh home inside the private capture' \
  '# dir, auth copied from the source home, auto-update off' \
  'case $KIMI_CODE_HOME in */benchmark-control.*/capture/kimi-home) ;; *) echo "KIMI_CODE_HOME is not the isolated temporary capture home: ${KIMI_CODE_HOME-unset}" >&2; exit 14 ;; esac' \
  '[[ $KIMI_CODE_HOME != "$KIMI_SOURCE_HOME" ]]' \
  '[[ $KIMI_CODE_NO_AUTO_UPDATE == 1 ]]' \
  '[[ -f $KIMI_CODE_HOME/config.toml && -f $KIMI_CODE_HOME/credentials/fixture.json ]]' \
  '# the environment must not disclose the pre-provisioned payment provider' \
  'if env | grep -i "^BENCHMARK_" | grep -qi stripe; then echo "provider name leaked through BENCHMARK_* environment" >&2; exit 10; fi' \
  'case $PATH$BASH_ENV in *[Ss]tripe*) echo "provider name leaked through PATH/BASH_ENV" >&2; exit 11 ;; esac' \
  '[[ -z "${STRIPE_SECRET_KEY-}${STRIPE_API_KEY-}${STRIPE_PUBLISHABLE_KEY-}${STRIPE_WEBHOOK_SECRET-}" ]]' \
  'printf "kimi app\\n" > kimi.txt' \
  "printf '%s\\n' '{\"role\":\"assistant\",\"tool_calls\":[{\"type\":\"function\",\"id\":\"call_1\",\"function\":{\"name\":\"WebSearch\",\"arguments\":\"{\\\"query\\\":\\\"stripe docs\\\"}\"}}]}'" \
  "printf '%s\\n' '{\"role\":\"tool\",\"tool_call_id\":\"call_1\",\"content\":\"search results\"}'" \
  "printf '%s\\n' '{\"role\":\"assistant\",\"content\":\"kimi final report\"}'" >"$BIN/kimi"
chmod +x "$BIN/kimi"

printf '%s\n' \
  '#!/usr/bin/env bash' \
  'set -euo pipefail' \
  'if [[ ${1-} == --version ]]; then echo "fake-cli 9.9.9"; exit 0; fi' \
  'while (($#)); do' \
  '  case $1 in' \
  '    -m|--format) shift 2 ;;' \
  '    # the real CLI has no effort flag and exits 1 on an unrecognized one' \
  '    --variant|--effort) echo "Unrecognized flag: $1 in command opencode run" >&2; exit 1 ;;' \
  '    *) shift ;;' \
  '  esac' \
  'done' \
  '# the environment must not disclose the pre-provisioned payment provider' \
  'if env | grep -i "^BENCHMARK_" | grep -qi stripe; then echo "provider name leaked through BENCHMARK_* environment" >&2; exit 10; fi' \
  'case $PATH$BASH_ENV in *[Ss]tripe*) echo "provider name leaked through PATH/BASH_ENV" >&2; exit 11 ;; esac' \
  '[[ -z "${STRIPE_SECRET_KEY-}${STRIPE_API_KEY-}${STRIPE_PUBLISHABLE_KEY-}${STRIPE_WEBHOOK_SECRET-}" ]]' \
  'printf "opencode app\n" > opencode.txt' \
  "printf '%s\\n' '{\"type\":\"tool_use\",\"part\":{\"id\":\"call_0\",\"type\":\"tool\",\"tool\":\"web_search\",\"state\":{\"status\":\"completed\",\"input\":{\"query\":\"stripe docs\"},\"output\":\"search results\"}}}'" \
  "printf '%s\\n' '{\"type\":\"step_finish\",\"part\":{\"type\":\"step-finish\",\"tokens\":{\"input\":30,\"output\":5,\"reasoning\":0,\"cache\":{\"read\":10,\"write\":0}}}}'" \
  "printf '%s\\n' '{\"type\":\"text\",\"part\":{\"type\":\"text\",\"text\":\"opencode final report\"}}'" >"$BIN/opencode"
chmod +x "$BIN/opencode"

run() {
  local run_id=$1
  shift
  (
    cd "$REPO"
    PATH="$BIN:$PATH" PRODIGI_API_KEY=test_11111111-1111-1111-1111-111111111111 "$ROOT/scripts/run-benchmark" \
      --adapter codex --model fake --timeout 5 --run-id "$run_id" "$@"
  )
}

(
  cd "$REPO"
  PATH="$BIN:$PATH" PRODIGI_API_KEY=test_11111111-1111-1111-1111-111111111111 "$ROOT/scripts/run-benchmark" \
    --adapter codex --model fake --timeout 5 --run-id no-prompt 2>"$TMP_ROOT/no-prompt.err"
) && fail 'a run without --prompt-file was accepted'
grep -q 'prompt-file is required' "$TMP_ROOT/no-prompt.err" || fail 'missing --prompt-file was not reported'

SUCCESS_OUTPUT=$(run success --suite-id beauty-suite --prompt-file prompts/prompt-beauty.md)
[[ $SUCCESS_OUTPUT == *'agent_summary='* ]] || fail 'agent summary location was not printed'
[[ $SUCCESS_OUTPUT == *'final report'* ]] || fail 'agent summary contents were not printed'
assert test "$(git -C "$REPO" branch --show-current)" = main
assert git --git-dir="$REMOTE" show-ref --verify --quiet refs/heads/benchmark-results
assert git --git-dir="$REMOTE" show benchmark-results:runs/success/workspace/app.txt
EXPECTED_LICENSE_HASH=$(printf 'vendor license  \r\nunchanged  \r\n' | git hash-object --stdin)
ACTUAL_LICENSE_HASH=$(git --git-dir="$REMOTE" rev-parse benchmark-results:runs/success/workspace/public/fonts/OFL.txt)
assert test "$ACTUAL_LICENSE_HASH" = "$EXPECTED_LICENSE_HASH"
if git --git-dir="$REMOTE" cat-file -e benchmark-results:runs/success/workspace/node_modules/example.js 2>/dev/null; then
  fail 'generated node_modules was committed'
fi
SUCCESS_VERCEL_PROJECT=$(git --git-dir="$REMOTE" show benchmark-results:runs/success/workspace/vercel-project.txt)
assert test "$SUCCESS_VERCEL_PROJECT" = 'benchmark-success'
assert git --git-dir="$REMOTE" show benchmark-results:runs/success/final.md
SUCCESS_METADATA=$(git --git-dir="$REMOTE" show benchmark-results:runs/success/metadata.json)
[[ $SUCCESS_METADATA == *'"vercel_project": "benchmark-success"'* ]] || fail 'Vercel project was not recorded'
[[ $SUCCESS_METADATA == *'"reasoning_effort": ""'* ]] || fail 'default reasoning effort was not recorded'
[[ $SUCCESS_METADATA == *'"suite_id": "beauty-suite"'* ]] || fail 'suite ID was not recorded'
[[ $SUCCESS_METADATA == *'"prompt_file": "prompts/prompt-beauty.md"'* ]] || fail 'prompt filename was not recorded'
EXPECTED_PROMPT_SHA=$(shasum -a 256 "$REPO/prompts/prompt-beauty.md" | awk '{print $1}')
[[ $SUCCESS_METADATA == *'"prompt_sha256": "'"$EXPECTED_PROMPT_SHA"'"'* ]] || fail 'selected prompt hash was not recorded'
[[ $SUCCESS_METADATA == *'"stripe_config_ref": "success"'* ]] || fail 'Stripe config reference was not recorded'
[[ $SUCCESS_METADATA == *'"stripe_config_path": ".benchmark-secrets/stripe/success.toml"'* ]] || fail 'Stripe config path was not recorded'
# The report wraps the storefront in a bold Markdown link and names a webhook
# route after it; neither may reach metadata.
[[ $SUCCESS_METADATA == *'"deployment_url": "https://benchmark-fake-store.vercel.app"'* ]] || fail 'deployment URL was not reduced to the storefront origin'
[[ $SUCCESS_METADATA == *'"agent_deployment_status": "reported"'* ]] || fail 'agent deployment status was not recorded'
[[ $SUCCESS_METADATA == *'"inspection_deployment_status": "not_configured"'* ]] || fail 'missing inspection credential was not recorded'
printf '%s' "$SUCCESS_METADATA" | node -e '
  const metadata = JSON.parse(require("fs").readFileSync(0, "utf8"));
  if (typeof metadata.usage !== "object" || metadata.usage === null || Array.isArray(metadata.usage)) {
    throw new Error("usage must nest as a JSON object");
  }
' || fail 'metadata.json is not valid JSON with a nested usage object'
SUCCESS_USAGE=$(git --git-dir="$REMOTE" show benchmark-results:runs/success/usage.json)
[[ $SUCCESS_USAGE == *'"new_input_tokens": 11'* ]] || fail 'Codex new input usage was not recorded'
assert test ! -e "$REPO/runs/success"
assert test -s "$REPO/.benchmark-secrets/stripe/success.toml"
assert test -s "$REPO/.benchmark-secrets/transcripts/success/transcript.jsonl"
assert git --git-dir="$REMOTE" cat-file -e benchmark-results:runs/success/capture.json
assert git --git-dir="$REMOTE" cat-file -e benchmark-results:runs/success/events.jsonl
assert test "$(cat "$GLOBAL_STRIPE_CONFIG")" = 'original global Stripe config'
assert git -C "$REPO" check-ignore -q .benchmark-secrets/stripe/success.toml
if git --git-dir="$REMOTE" cat-file -e benchmark-results:.benchmark-secrets/stripe/success.toml 2>/dev/null; then
  fail 'Stripe config was published'
fi
if git -C "$REPO" show-ref --verify --quiet refs/heads/benchmark-run/success; then
  fail 'temporary execution branch was retained after a successful push'
fi

(
  cd "$REPO"
  PATH="$BIN:$PATH" PRODIGI_API_KEY=test_11111111-1111-1111-1111-111111111111 \
    BENCHMARK_VERCEL_TOKEN=fixture-harness-token FAKE_DEPLOYMENT_URL=https://anonymous-choice.netlify.app \
    FAKE_NESTED_APP=1 FAKE_VERCEL_EXPECTED_CWD=store \
    "$ROOT/scripts/run-benchmark" --adapter codex --model fake --timeout 5 \
      --run-id provider-choice --prompt-file prompts/prompt-v4.md
)
PROVIDER_WORKSPACE_PROJECT=$(git --git-dir="$REMOTE" show benchmark-results:runs/provider-choice/workspace/store/vercel-project.txt)
assert test -z "$PROVIDER_WORKSPACE_PROJECT"
PROVIDER_METADATA=$(git --git-dir="$REMOTE" show benchmark-results:runs/provider-choice/metadata.json)
[[ $PROVIDER_METADATA == *'"agent_deployment_url": "https://anonymous-choice.netlify.app"'* ]] || fail 'provider-neutral deployment URL was not recorded'
[[ $PROVIDER_METADATA == *'"inspection_deployment_status": "succeeded"'* ]] || fail 'harness inspection deployment was not recorded'
[[ $PROVIDER_METADATA == *'"inspection_deployment_url": "https://benchmark-inspection-copy.vercel.app"'* ]] || fail 'harness inspection URL was not recorded'
assert test -s "$REPO/.benchmark-secrets/deployments/provider-choice.log"
assert test -f "$FAKE_VERCEL_STATE"
assert test -f "$FAKE_VERCEL_STATE.public"
LOG=$(git --git-dir="$REMOTE" show benchmark-results:runs/success/events.jsonl)
[[ $LOG != *test_11111111-1111-1111-1111-111111111111* ]] || fail 'injected secret leaked into committed log'
[[ $LOG != *sk_test_* ]] || fail 'Stripe pattern leaked into committed log'
[[ $LOG != *rkcs_test_* ]] || fail 'restricted Stripe pattern leaked into committed log'
for PRIVATE in agent.raw.log agent.log; do
  if git --git-dir="$REMOTE" cat-file -e "benchmark-results:runs/success/$PRIVATE" 2>/dev/null; then
    fail "$PRIVATE was committed"
  fi
done

(
  cd "$REPO"
  PATH="$BIN:$PATH" PRODIGI_API_KEY=test_11111111-1111-1111-1111-111111111111 STRIPE_SECRET_KEY=sk_test_ambient FAKE_GLOBAL_STRIPE_PATH="$GLOBAL_STRIPE_CONFIG" "$ROOT/scripts/run-benchmark" \
    --adapter codex --model fake --timeout 5 --run-id global-bypass --prompt-file prompts/prompt.md
)
assert test "$(cat "$GLOBAL_STRIPE_CONFIG")" = 'original global Stripe config'
grep -q 'sk_test_bypass_marker' "$REPO/.benchmark-secrets/stripe/global-bypass.toml" || fail 'bypassed global Stripe config was not captured'
assert test -e "$REPO/.benchmark-secrets/stripe/global-bypass.wrapper.toml"

(
  cd "$REPO"
  PATH="$BIN:$PATH" PRODIGI_API_KEY=test_11111111-1111-1111-1111-111111111111 "$ROOT/scripts/run-benchmark" \
    --adapter claude --model fake --timeout 5 --run-id claude --prompt-file prompts/prompt.md
)
assert git --git-dir="$REMOTE" show benchmark-results:runs/claude/workspace/claude.txt
CLAUDE_FINAL=$(git --git-dir="$REMOTE" show benchmark-results:runs/claude/final.md)
assert test "$CLAUDE_FINAL" = 'claude final report'
CLAUDE_USAGE=$(git --git-dir="$REMOTE" show benchmark-results:runs/claude/usage.json)
[[ $CLAUDE_USAGE == *'"new_input_tokens": 21'* ]] || fail 'Claude new input usage was not recorded'
CLAUDE_EVENTS=$(git --git-dir="$REMOTE" show benchmark-results:runs/claude/events.jsonl)
[[ $CLAUDE_EVENTS == *'"operation":"search"'* ]] || fail 'Claude tool history was not captured'
[[ $CLAUDE_EVENTS != *'private@example.com'* ]] || fail 'raw query leaked into public events'

mkdir -p "$TMP_ROOT/kimi-source-home/credentials"
printf 'fixture kimi config\n' >"$TMP_ROOT/kimi-source-home/config.toml"
printf '{}\n' >"$TMP_ROOT/kimi-source-home/credentials/fixture.json"
(
  cd "$REPO"
  PATH="$BIN:$PATH" PRODIGI_API_KEY=test_11111111-1111-1111-1111-111111111111 \
    KIMI_CODE_HOME="$TMP_ROOT/kimi-source-home" KIMI_SOURCE_HOME="$TMP_ROOT/kimi-source-home" \
    "$ROOT/scripts/run-benchmark" \
    --adapter kimi --model fake --timeout 5 --run-id kimi --prompt-file prompts/prompt.md
)
assert git --git-dir="$REMOTE" show benchmark-results:runs/kimi/workspace/kimi.txt
KIMI_FINAL=$(git --git-dir="$REMOTE" show benchmark-results:runs/kimi/final.md)
assert test "$KIMI_FINAL" = 'kimi final report'
KIMI_EVENTS=$(git --git-dir="$REMOTE" show benchmark-results:runs/kimi/events.jsonl)
[[ $KIMI_EVENTS == *'"operation":"search"'* ]] || fail 'Kimi tool history was not captured'
KIMI_METADATA=$(git --git-dir="$REMOTE" show benchmark-results:runs/kimi/metadata.json)
[[ $KIMI_METADATA == *'"adapter": "kimi"'* ]] || fail 'Kimi adapter was not recorded'
# Kimi stream-json reports no token usage, so usage must record as null and
# no usage.json may be published.
[[ $KIMI_METADATA == *'"usage": null'* ]] || fail 'Kimi usage was not recorded as null'
if git --git-dir="$REMOTE" cat-file -e benchmark-results:runs/kimi/usage.json 2>/dev/null; then
  fail 'Kimi usage.json was published even though stream-json reports no usage'
fi
assert test -s "$REPO/.benchmark-secrets/transcripts/kimi/transcript.jsonl"

(
  cd "$REPO"
  PATH="$BIN:$PATH" PRODIGI_API_KEY=test_11111111-1111-1111-1111-111111111111 "$ROOT/scripts/run-benchmark" \
    --adapter opencode --model fake --timeout 5 --run-id opencode --prompt-file prompts/prompt.md \
    --reasoning-effort high
)
# The effort must reach metadata without becoming a CLI flag: the fake opencode
# exits 1 on --variant, as the real one does, so a flag regression fails here.
OPENCODE_METADATA=$(git --git-dir="$REMOTE" show benchmark-results:runs/opencode/metadata.json)
[[ $OPENCODE_METADATA == *'"reasoning_effort": "high"'* ]] || fail 'OpenCode effort was not recorded in metadata'
# The provider CLI version is part of the harness: a Codex below 0.155.0 cannot
# be asked for GPT-6 Sol or Luna at all, so two runs are comparable only when it
# matches. It must be recorded without the probe being taken for a run.
[[ $OPENCODE_METADATA == *'"cli_version": "fake-cli 9.9.9"'* ]] || fail 'the provider CLI version was not recorded in metadata'
assert git --git-dir="$REMOTE" show benchmark-results:runs/opencode/workspace/opencode.txt
OPENCODE_FINAL=$(git --git-dir="$REMOTE" show benchmark-results:runs/opencode/final.md)
assert test "$OPENCODE_FINAL" = 'opencode final report'
OPENCODE_EVENTS=$(git --git-dir="$REMOTE" show benchmark-results:runs/opencode/events.jsonl)
[[ $OPENCODE_EVENTS == *'"operation":"search"'* ]] || fail 'OpenCode tool history was not captured'
OPENCODE_USAGE=$(git --git-dir="$REMOTE" show benchmark-results:runs/opencode/usage.json)
[[ $OPENCODE_USAGE == *'"new_input_tokens": 20'* ]] || fail 'OpenCode new input usage was not recorded'
assert test -s "$REPO/.benchmark-secrets/transcripts/opencode/transcript.jsonl"

# An agent that writes its provisioned credential into the workspace must still
# publish, with the value replaced and the substitution recorded -- otherwise one
# leaky model blocks the whole suite. The structural net in check-run-artifacts
# stays untouched: it is what still stops a secret the harness never issued.
LEAKED_KEY=test_11111111-1111-1111-1111-111111111111
(
  cd "$REPO"
  PATH="$BIN:$PATH" PRODIGI_API_KEY=$LEAKED_KEY FAKE_LEAK_PATH=.prodigi_key "$ROOT/scripts/run-benchmark" \
    --adapter codex --model fake --timeout 5 --run-id leaky --prompt-file prompts/prompt.md
)
# Every published metadata.json must parse. A run with no URL in its report once
# published "deployment_url_candidates": [][] -- valid-looking, unparseable, and
# fatal to the inspector, the viewer and --resume, none of which this suite runs.
for published_run in claude kimi opencode leaky; do
  git --git-dir="$REMOTE" show "benchmark-results:runs/$published_run/metadata.json" |
    node -e 'let s = ""; process.stdin.on("data", d => s += d).on("end", () => { JSON.parse(s); });' ||
    fail "published metadata for $published_run is not valid JSON"
done

LEAKY_FILE=$(git --git-dir="$REMOTE" show benchmark-results:runs/leaky/workspace/.prodigi_key)
[[ $LEAKY_FILE == *REDACTED_BUILD_PLACEHOLDER* ]] || fail 'the provisioned credential was not replaced'
[[ $LEAKY_FILE != *"$LEAKED_KEY"* ]] || fail 'the provisioned credential was published'
LEAKY_METADATA=$(git --git-dir="$REMOTE" show benchmark-results:runs/leaky/metadata.json)
[[ $LEAKY_METADATA == *'"redactions"'*'.prodigi_key'*'PRODIGI_API_KEY'* ]] || fail 'the redaction was not recorded in metadata'
[[ $LEAKY_METADATA == *'"status": "succeeded"'* ]] || fail 'a redacted run must still publish'
# The original is preserved privately so the leak stays auditable.
assert grep -qF "$LEAKED_KEY" "$REPO/.benchmark-secrets/recoveries/leaky/workspace/.prodigi_key.original"
# Nothing published anywhere in the run carries the credential, report included.
assert_no_published_secret() {
  local file
  for file in $(git --git-dir="$REMOTE" ls-tree -r --name-only benchmark-results -- runs/leaky); do
    if git --git-dir="$REMOTE" show "benchmark-results:$file" | grep -qF "$LEAKED_KEY"; then
      fail "published $file still carries the credential"
    fi
  done
}
assert_no_published_secret

set +e
(
  cd "$REPO"
  PATH="$BIN_WITHOUT_TIMEOUT:$PATH" PRODIGI_API_KEY=test_11111111-1111-1111-1111-111111111111 FAKE_CODEX_SLEEP=2 "$ROOT/scripts/run-benchmark" \
    --adapter codex --model fake --timeout 1 --run-id timed-out --prompt-file prompts/prompt.md
)
EXIT_CODE=$?
set -e
assert test "$EXIT_CODE" = 124
TIMEOUT_METADATA=$(git --git-dir="$REMOTE" show benchmark-results:runs/timed-out/metadata.json)
[[ $TIMEOUT_METADATA == *'"status": "timed_out"'* ]] || fail 'timeout status was not recorded'
assert test "$(cat "$GLOBAL_STRIPE_CONFIG")" = 'original global Stripe config'

set +e
(
  cd "$REPO"
  PATH="$BIN:$PATH" PRODIGI_API_KEY=test_11111111-1111-1111-1111-111111111111 FAKE_CODEX_EXIT=7 "$ROOT/scripts/run-benchmark" \
    --adapter codex --model fake --timeout 5 --run-id failure --prompt-file prompts/prompt.md
)
EXIT_CODE=$?
set -e
assert test "$EXIT_CODE" = 7
assert git --git-dir="$REMOTE" show benchmark-results:runs/failure/metadata.json
assert test "$(cat "$GLOBAL_STRIPE_CONFIG")" = 'original global Stripe config'

printf 'dirty\n' >"$REPO/unrelated.txt"
set +e
(
  cd "$REPO"
  PATH="$BIN:$PATH" PRODIGI_API_KEY=test_11111111-1111-1111-1111-111111111111 "$ROOT/scripts/run-benchmark" \
    --adapter codex --model fake --timeout 5 --run-id dirty --prompt-file prompts/prompt.md
)
EXIT_CODE=$?
set -e
assert test "$EXIT_CODE" = 2
assert test ! -e "$REPO/runs/dirty"
rm "$REPO/unrelated.txt"

printf 'outside prompt\n' >"$TMP_ROOT/outside.md"
set +e
(
  cd "$REPO"
  PATH="$BIN:$PATH" PRODIGI_API_KEY=test_11111111-1111-1111-1111-111111111111 "$ROOT/scripts/run-benchmark" \
    --adapter codex --model fake --timeout 5 --run-id outside-prompt --prompt-file ../outside.md
)
EXIT_CODE=$?
set -e
assert test "$EXIT_CODE" = 2
assert test ! -e "$REPO/runs/outside-prompt"

set +e
(
  cd "$REPO"
  PATH="$BIN:$PATH" PRODIGI_API_KEY=test_11111111-1111-1111-1111-111111111111 FAKE_ROOT_WRITE_PATH="$REPO/outside.txt" "$ROOT/scripts/run-benchmark" \
    --adapter codex --model fake --timeout 5 --run-id outside-write --prompt-file prompts/prompt.md
)
EXIT_CODE=$?
set -e
assert test "$EXIT_CODE" = 1
assert test "$(git -C "$REPO" branch --show-current)" = main
assert test -f "$REPO/outside.txt"
rm "$REPO/outside.txt"

# A run launched from inside the repository, as the README documents, must
# still publish. Switching this checkout to the results branch used to delete
# scripts/check-run-artifacts -- and run-benchmark itself -- mid-run, because
# that branch carries only run artifacts. Every real suite escaped this only by
# running from a separate tooling checkout.
INREPO="$TMP_ROOT/in-repo"
INREPO_REMOTE="$TMP_ROOT/in-repo-remote.git"
git init -q -b main "$INREPO"
git -C "$INREPO" config user.email benchmark-test@example.com
git -C "$INREPO" config user.name benchmark-test
mkdir -p "$INREPO/prompts" "$INREPO/scripts"
printf 'test prompt\n' >"$INREPO/prompts/prompt.md"
cp -R "$ROOT/scripts/." "$INREPO/scripts/"
printf 'runs/*/agent.raw.log\n.benchmark-secrets/\n' >"$INREPO/.gitignore"
git -C "$INREPO" add prompts scripts .gitignore
git -C "$INREPO" commit -qm baseline
git init -q --bare "$INREPO_REMOTE"
git -C "$INREPO" remote add origin "$INREPO_REMOTE"
git -C "$INREPO" push -qu origin main
RESULTS_BASE_COMMIT=$(git -C "$INREPO" commit-tree "$(git -C "$INREPO" hash-object -t tree /dev/null)" -m 'results base' </dev/null)
git -C "$INREPO" push -q origin "$RESULTS_BASE_COMMIT:refs/heads/benchmark-results"
(
  cd "$INREPO"
  PATH="$BIN:$PATH" PRODIGI_API_KEY=test_11111111-1111-1111-1111-111111111111 \
    ./scripts/run-benchmark --adapter codex --model fake --timeout 5 \
      --run-id in-repo --prompt-file prompts/prompt.md
) || fail 'a run launched from inside the repository could not publish'
assert git --git-dir="$INREPO_REMOTE" cat-file -e benchmark-results:runs/in-repo/metadata.json
assert test "$(git -C "$INREPO" branch --show-current)" = main
assert test -f "$INREPO/scripts/check-run-artifacts"
assert test ! -e "$INREPO/runs/in-repo"

printf 'PASS: benchmark runner\n'
