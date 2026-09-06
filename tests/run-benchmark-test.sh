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
printf 'original global Stripe config\n' >"$GLOBAL_STRIPE_CONFIG"
export BENCHMARK_GLOBAL_STRIPE_CONFIG="$GLOBAL_STRIPE_CONFIG"
git init -q -b main "$REPO"
git -C "$REPO" config user.email benchmark-test@example.com
git -C "$REPO" config user.name benchmark-test
printf 'test prompt\n' >"$REPO/prompt.md"
printf 'beauty prompt\n' >"$REPO/prompt-beauty.md"
printf 'runs/*/agent.raw.log\n.benchmark-secrets/\n' >"$REPO/.gitignore"
git -C "$REPO" add prompt.md prompt-beauty.md .gitignore
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
  '[[ $1 == --config ]]' \
  '[[ $2 == "$BENCHMARK_STRIPE_CONFIG" ]]' \
  'printf "fake Stripe profile\\n" >>"$BENCHMARK_STRIPE_CONFIG"' >"$BIN/stripe"
chmod +x "$BIN/stripe"

printf '%s\n' \
  '#!/usr/bin/env bash' \
  'set -euo pipefail' \
  'output=' \
  'workspace=' \
  'while (($#)); do' \
  '  case $1 in' \
  '    --output-last-message) output=$2; shift 2 ;;' \
  '    --cd) workspace=$2; shift 2 ;;' \
  '    *) shift ;;' \
  '  esac' \
  'done' \
  'case $(/bin/bash -lc "command -v stripe") in *benchmark-stripe-shim.*/stripe) ;; *) exit 9 ;; esac' \
  '[[ -z "${STRIPE_SECRET_KEY-}${STRIPE_API_KEY-}${STRIPE_PUBLISHABLE_KEY-}${STRIPE_WEBHOOK_SECRET-}" ]]' \
  'if [[ -n "${FAKE_GLOBAL_STRIPE_PATH:-}" ]]; then mkdir -p "$(dirname "$FAKE_GLOBAL_STRIPE_PATH")"; printf "test_mode_api_key = '\''sk_test_bypass_marker'\''\n" >"$FAKE_GLOBAL_STRIPE_PATH"; fi' \
  '[[ -n "${FAKE_CODEX_SLEEP:-}" ]] && sleep "$FAKE_CODEX_SLEEP"' \
  '[[ -n "${FAKE_ROOT_WRITE_PATH:-}" ]] && printf "outside workspace\n" >"$FAKE_ROOT_WRITE_PATH"' \
  'mkdir -p "$workspace"' \
  'git init -q "$workspace"' \
  'stripe sandbox create --non-interactive' \
  'printf "%s\n" "$BENCHMARK_VERCEL_PROJECT" >"$workspace/vercel-project.txt"' \
  'printf "node_modules\n" >"$workspace/.gitignore"' \
  'mkdir -p "$workspace/node_modules"' \
  'printf "generated dependency\n" >"$workspace/node_modules/example.js"' \
  'printf "generated app\n" >"$workspace/app.txt"' \
  'printf "formatted CLI output  \n"' \
  "printf '%s\\n' '{\"type\":\"turn.completed\",\"usage\":{\"input_tokens\":11,\"output_tokens\":7,\"total_tokens\":18}}'" \
  'printf "PRODIGI_API_KEY=%s sk_test_abcdefghijklmnop rkcs_test_abcdefghijklmnop https://example.vercel.app\n" "$PRODIGI_API_KEY"' \
  'printf "final report\n" >"$output"' \
  'exit "${FAKE_CODEX_EXIT:-0}"' >"$BIN/codex"
chmod +x "$BIN/codex"
ln -s "$BIN/codex" "$BIN_WITHOUT_TIMEOUT/codex"

printf '%s\n' \
  '#!/usr/bin/env bash' \
  'set -euo pipefail' \
  'printf "claude app\\n" > claude.txt' \
  "printf '%s\\n' '{\"result\":\"claude final report\",\"usage\":{\"input_tokens\":21,\"output_tokens\":13}}'" >"$BIN/claude"
chmod +x "$BIN/claude"

run() {
  local run_id=$1
  shift
  (
    cd "$REPO"
    PATH="$BIN:$PATH" PRODIGI_API_KEY=test_11111111-1111-1111-1111-111111111111 "$ROOT/scripts/run-benchmark" \
      --adapter codex --model fake --timeout 5 --run-id "$run_id" "$@"
  )
}

SUCCESS_OUTPUT=$(run success --suite-id beauty-suite --prompt-file prompt-beauty.md)
[[ $SUCCESS_OUTPUT == *'agent_summary='* ]] || fail 'agent summary location was not printed'
[[ $SUCCESS_OUTPUT == *'final report'* ]] || fail 'agent summary contents were not printed'
assert test "$(git -C "$REPO" branch --show-current)" = main
assert git --git-dir="$REMOTE" show-ref --verify --quiet refs/heads/benchmark-results
assert git --git-dir="$REMOTE" show benchmark-results:runs/success/workspace/app.txt
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
[[ $SUCCESS_METADATA == *'"prompt_file": "prompt-beauty.md"'* ]] || fail 'prompt filename was not recorded'
EXPECTED_PROMPT_SHA=$(shasum -a 256 "$REPO/prompt-beauty.md" | awk '{print $1}')
[[ $SUCCESS_METADATA == *'"prompt_sha256": "'"$EXPECTED_PROMPT_SHA"'"'* ]] || fail 'selected prompt hash was not recorded'
[[ $SUCCESS_METADATA == *'"stripe_config_ref": "success"'* ]] || fail 'Stripe config reference was not recorded'
[[ $SUCCESS_METADATA == *'"stripe_config_path": ".benchmark-secrets/stripe/success.toml"'* ]] || fail 'Stripe config path was not recorded'
SUCCESS_USAGE=$(git --git-dir="$REMOTE" show benchmark-results:runs/success/usage.json)
[[ $SUCCESS_USAGE == *'"new_input_tokens": 11'* ]] || fail 'Codex new input usage was not recorded'
assert test ! -e "$REPO/runs/success"
assert test -s "$REPO/.benchmark-secrets/stripe/success.toml"
assert test "$(cat "$GLOBAL_STRIPE_CONFIG")" = 'original global Stripe config'
assert git -C "$REPO" check-ignore -q .benchmark-secrets/stripe/success.toml
if git --git-dir="$REMOTE" cat-file -e benchmark-results:.benchmark-secrets/stripe/success.toml 2>/dev/null; then
  fail 'Stripe config was published'
fi
if git -C "$REPO" show-ref --verify --quiet refs/heads/benchmark-run/success; then
  fail 'temporary execution branch was retained after a successful push'
fi
LOG=$(git --git-dir="$REMOTE" show benchmark-results:runs/success/agent.log)
[[ $LOG == *'[REDACTED]'* ]] || fail 'injected secret was not redacted'
[[ $LOG != *test_11111111-1111-1111-1111-111111111111* ]] || fail 'injected secret leaked into committed log'
[[ $LOG != *sk_test_* ]] || fail 'Stripe pattern leaked into committed log'
[[ $LOG != *rkcs_test_* ]] || fail 'restricted Stripe pattern leaked into committed log'
if git --git-dir="$REMOTE" cat-file -e benchmark-results:runs/success/agent.raw.log 2>/dev/null; then
  fail 'raw log was committed'
fi

(
  cd "$REPO"
  PATH="$BIN:$PATH" PRODIGI_API_KEY=test_11111111-1111-1111-1111-111111111111 STRIPE_SECRET_KEY=sk_test_ambient FAKE_GLOBAL_STRIPE_PATH="$GLOBAL_STRIPE_CONFIG" "$ROOT/scripts/run-benchmark" \
    --adapter codex --model fake --timeout 5 --run-id global-bypass
)
assert test "$(cat "$GLOBAL_STRIPE_CONFIG")" = 'original global Stripe config'
grep -q 'sk_test_bypass_marker' "$REPO/.benchmark-secrets/stripe/global-bypass.toml" || fail 'bypassed global Stripe config was not captured'
assert test -e "$REPO/.benchmark-secrets/stripe/global-bypass.wrapper.toml"

(
  cd "$REPO"
  PATH="$BIN:$PATH" PRODIGI_API_KEY=test_11111111-1111-1111-1111-111111111111 "$ROOT/scripts/run-benchmark" \
    --adapter claude --model fake --timeout 5 --run-id claude
)
assert git --git-dir="$REMOTE" show benchmark-results:runs/claude/workspace/claude.txt
CLAUDE_FINAL=$(git --git-dir="$REMOTE" show benchmark-results:runs/claude/final.md)
assert test "$CLAUDE_FINAL" = 'claude final report'
CLAUDE_USAGE=$(git --git-dir="$REMOTE" show benchmark-results:runs/claude/usage.json)
[[ $CLAUDE_USAGE == *'"new_input_tokens": 21'* ]] || fail 'Claude new input usage was not recorded'

set +e
(
  cd "$REPO"
  PATH="$BIN_WITHOUT_TIMEOUT:$PATH" PRODIGI_API_KEY=test_11111111-1111-1111-1111-111111111111 FAKE_CODEX_SLEEP=2 "$ROOT/scripts/run-benchmark" \
    --adapter codex --model fake --timeout 1 --run-id timed-out
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
    --adapter codex --model fake --timeout 5 --run-id failure
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
    --adapter codex --model fake --timeout 5 --run-id dirty
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
    --adapter codex --model fake --timeout 5 --run-id outside-write
)
EXIT_CODE=$?
set -e
assert test "$EXIT_CODE" = 1
assert test "$(git -C "$REPO" branch --show-current)" = main
assert test -f "$REPO/outside.txt"
rm "$REPO/outside.txt"

printf 'PASS: benchmark runner\n'
