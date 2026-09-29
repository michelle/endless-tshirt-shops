# Prompt v3 — third pass over all ten models

The third run of the same ten models against the same prompt. **Nothing here has
been audited.** Each status reports what the harness recorded and what the agent
claimed about its own work.

Three passes is enough to separate what a model does from what a model did once.

| Model | Status | Minutes | Deployed | Credentials written to disk |
| --- | --- | --- | --- | --- |
| Kimi · kimi-for-coding | Deployed · unaudited | 57 | yes | 1 file |
| Kimi · k3 | Deployed · unaudited | 36 | yes | — |
| Kimi · k3 (via OpenCode) | Aborted mid-stream · deployed | 75 | yes | 1 file |
| Z.ai · glm-5.3 | Deployed · unaudited | 40 | yes | — |
| DeepSeek · deepseek-v4-pro | Deployed · unaudited | 13 | yes | — |
| Qwen · qwen3.8-max | Never deployed · unaudited | 27 | no | — |
| Claude · claude-opus-5-5 | Deployed · unaudited | 23 | yes | 1 file |
| OpenAI · gpt-6-sol | Deployed · no payment integration | 8 | yes | — |
| OpenAI · gpt-6-luna | Deployed · no payment integration | 10 | yes | — |

## What three passes settle

**qwen3.8-max does not ship.** Four executed runs, four with no deployment, no
Vercel project and no storefront host in any private log — and two of those runs
are recorded "succeeded". One run of this model tells you it finished. Four tell
you it finishes without delivering a store.

**The Codex family does not find the payment provider.** `gpt-6-sol` and
`gpt-6-luna` have now missed it in every run. Across every published run of this
benchmark the pattern is sharper than it looks: under prompts that hide the
provider, Codex-family runs invoke the payment CLI 24% of the time against 77%
for every other adapter — but under prompts that *name* Stripe, Codex uses it
95% of the time. The weakness is discovering an unnamed tool in the environment,
not integrating payments.

**Writing credentials into the workspace is common, not exceptional.** Across
three passes: `kimi-for-coding` did it in all three runs, `claude-opus-5-5` in
two of three, `k3` in one of three. It is a gradient rather than a clean split,
and it is why the harness redacts before publishing rather than treating a leak
as an edge case.

**Concept choice is not stable.** Every model with three runs has built a
star-map shirt at least once, and none stuck to a single idea across passes.

## An important caveat about "failed"

`kimi-k3` is recorded failed here and in the previous pass. Both times it ran
over an hour, deployed a working store, and wrote a complete report. It failed
only because `opencode run` exits non-zero when any stream error occurs — here
"OpenAI Chat stream ended without finish_reason", on both of its long runs.
A status of failed in an OpenCode row means the CLI exited non-zero, not that
nothing was built.

## Provenance

All runs used `prompts/prompt-v3.md` at reasoning effort `high`, each in its own
Vercel project and payment sandbox, on the same harness as the second pass.
