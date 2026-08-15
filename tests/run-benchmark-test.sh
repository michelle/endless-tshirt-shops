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
mkdir -p "$REPO" "$BIN" "$BIN_WITHOUT_TIMEOUT"
git init -q -b main "$REPO"
git -C "$REPO" config user.email benchmark-test@example.com
git -C "$REPO" config user.name benchmark-test
printf 'test prompt\n' >"$REPO/prompt.md"
printf 'runs/*/agent.raw.log\n' >"$REPO/.gitignore"
git -C "$REPO" add prompt.md .gitignore
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
  'output=' \
  'workspace=' \
  'while (($#)); do' \
  '  case $1 in' \
  '    --output-last-message) output=$2; shift 2 ;;' \
  '    --cd) workspace=$2; shift 2 ;;' \
  '    *) shift ;;' \
  '  esac' \
  'done' \
  '[[ -n "${FAKE_CODEX_SLEEP:-}" ]] && sleep "$FAKE_CODEX_SLEEP"' \
  '[[ -n "${FAKE_ROOT_WRITE_PATH:-}" ]] && printf "outside workspace\n" >"$FAKE_ROOT_WRITE_PATH"' \
  'mkdir -p "$workspace"' \
  'printf "node_modules\n" >"$workspace/.gitignore"' \
  'mkdir -p "$workspace/node_modules"' \
  'printf "generated dependency\n" >"$workspace/node_modules/example.js"' \
  'printf "generated app\n" >"$workspace/app.txt"' \
  'printf "SP_AUTH=%s sk_test_abcdefghijklmnop https://example.vercel.app\n" "$SP_AUTH"' \
  'printf "final report\n" >"$output"' \
  'exit "${FAKE_CODEX_EXIT:-0}"' >"$BIN/codex"
chmod +x "$BIN/codex"
ln -s "$BIN/codex" "$BIN_WITHOUT_TIMEOUT/codex"

printf '%s\n' \
  '#!/usr/bin/env bash' \
  'set -euo pipefail' \
  'printf "claude app\\n" > claude.txt' \
  "printf '%s\\n' '{\"result\":\"claude final report\"}'" >"$BIN/claude"
chmod +x "$BIN/claude"

run() {
  (
    cd "$REPO"
    PATH="$BIN:$PATH" SP_AUTH=sp_test_secret "$ROOT/scripts/run-benchmark" \
      --adapter codex --model fake --timeout 5 --run-id "$1"
  )
}

SUCCESS_OUTPUT=$(run success)
[[ $SUCCESS_OUTPUT == *'agent_summary='* ]] || fail 'agent summary location was not printed'
[[ $SUCCESS_OUTPUT == *'final report'* ]] || fail 'agent summary contents were not printed'
assert test "$(git -C "$REPO" branch --show-current)" = main
assert git --git-dir="$REMOTE" show-ref --verify --quiet refs/heads/benchmark/success
assert git --git-dir="$REMOTE" show benchmark/success:runs/success/workspace/app.txt
assert git --git-dir="$REMOTE" show benchmark/success:runs/success/final.md
assert test ! -e "$REPO/runs/success"
LOG=$(git --git-dir="$REMOTE" show benchmark/success:runs/success/agent.log)
[[ $LOG == *'[REDACTED]'* ]] || fail 'injected secret was not redacted'
[[ $LOG != *sp_test_secret* ]] || fail 'injected secret leaked into committed log'
[[ $LOG != *sk_test_* ]] || fail 'Stripe pattern leaked into committed log'
if git --git-dir="$REMOTE" cat-file -e benchmark/success:runs/success/agent.raw.log 2>/dev/null; then
  fail 'raw log was committed'
fi

(
  cd "$REPO"
  PATH="$BIN:$PATH" SP_AUTH=sp_test_secret "$ROOT/scripts/run-benchmark" \
    --adapter claude --model fake --timeout 5 --run-id claude
)
assert git --git-dir="$REMOTE" show benchmark/claude:runs/claude/workspace/claude.txt
CLAUDE_FINAL=$(git --git-dir="$REMOTE" show benchmark/claude:runs/claude/final.md)
assert test "$CLAUDE_FINAL" = 'claude final report'

set +e
(
  cd "$REPO"
  PATH="$BIN_WITHOUT_TIMEOUT:$PATH" SP_AUTH=sp_test_secret FAKE_CODEX_SLEEP=2 "$ROOT/scripts/run-benchmark" \
    --adapter codex --model fake --timeout 1 --run-id timed-out
)
EXIT_CODE=$?
set -e
assert test "$EXIT_CODE" = 124
TIMEOUT_METADATA=$(git --git-dir="$REMOTE" show benchmark/timed-out:runs/timed-out/metadata.json)
[[ $TIMEOUT_METADATA == *'"status": "timed_out"'* ]] || fail 'timeout status was not recorded'

set +e
(
  cd "$REPO"
  PATH="$BIN:$PATH" SP_AUTH=sp_test_secret FAKE_CODEX_EXIT=7 "$ROOT/scripts/run-benchmark" \
    --adapter codex --model fake --timeout 5 --run-id failure
)
EXIT_CODE=$?
set -e
assert test "$EXIT_CODE" = 7
assert git --git-dir="$REMOTE" show-ref --verify --quiet refs/heads/benchmark/failure
assert git --git-dir="$REMOTE" show benchmark/failure:runs/failure/metadata.json

printf 'dirty\n' >"$REPO/unrelated.txt"
set +e
(
  cd "$REPO"
  PATH="$BIN:$PATH" SP_AUTH=sp_test_secret "$ROOT/scripts/run-benchmark" \
    --adapter codex --model fake --timeout 5 --run-id dirty
)
EXIT_CODE=$?
set -e
assert test "$EXIT_CODE" = 2
assert test ! -e "$REPO/runs/dirty"
rm "$REPO/unrelated.txt"

set +e
(
  cd "$REPO"
  PATH="$BIN:$PATH" SP_AUTH=sp_test_secret FAKE_ROOT_WRITE_PATH="$REPO/outside.txt" "$ROOT/scripts/run-benchmark" \
    --adapter codex --model fake --timeout 5 --run-id outside-write
)
EXIT_CODE=$?
set -e
assert test "$EXIT_CODE" = 1
assert test "$(git -C "$REPO" branch --show-current)" = main
assert test -f "$REPO/outside.txt"
rm "$REPO/outside.txt"

printf 'PASS: benchmark runner\n'
