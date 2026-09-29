# Prompt v3 — second pass over all ten models

The same ten models, the same prompt, a second time. **Nothing here has been
audited.** Each status reports what the harness recorded and what the agent
claimed about its own work.

Read this suite against the first pass rather than on its own: it exists to show
what changes between runs of the same model, and the answer is *more than you
would expect*.

| Model | Status | Minutes | Deployed | Credentials written to disk |
| --- | --- | --- | --- | --- |
| Kimi · kimi-for-coding | Deployed · unaudited | 33 | yes | 1 file |
| Kimi · k3 | Deployed · unaudited | 51 | yes | 1 file |
| Kimi · k3 (via OpenCode) | Aborted mid-stream · deployed | 73 | yes | 1 file |
| Z.ai · glm-5.3 | Deployed · unaudited | 64 | yes | — |
| DeepSeek · deepseek-v4-pro | Deployed · unaudited | 15 | yes | — |
| Qwen · qwen3.8-max | Never deployed · unaudited | 41 | no | — |
| Claude · claude-opus-5-5 | Deployed · unaudited | 19 | yes | — |
| OpenAI · gpt-6-sol | Deployed · no payment integration | 10 | yes | — |
| OpenAI · gpt-6-luna | Deployed · no payment integration | 7 | yes | — |

## Concepts are not stable

Every model that built a celestial print in the first pass was free to do so
again. Most did not. `kimi-for-coding` went from a dictionary definition to a
sound waveform; `k3` left the night sky entirely; `claude-opus-5-5` walked into
it, having built a field guide to invented insects the first time.

The first pass looked like a striking convergence — six of ten models building
the same star-map shirt. That reading did not survive a second run. What the two
passes together suggest is an attractor most models fall into some of the time,
not a fixed preference any of them holds.

## What did repeat

`gpt-6-sol` and `gpt-6-luna` again never found the payment CLI the environment
deliberately does not name, and again finished in 10 and 7 minutes. That is the
missing half of the task, not speed.

`qwen3.8-max` again finished without shipping anything.

## Missing row

`minimax-m3` has no usable run in this pass. Its first attempt died when the
OpenCode account balance was exhausted mid-suite, and a re-run wrote a project
into the suite's own working tree instead of its workspace, which the runner
correctly refused to publish. Both are recorded on the results branch; neither
tells you anything about the model.

## Provenance

All runs used `prompts/prompt-v3.md` at reasoning effort `high`, each in its own
Vercel project and payment sandbox.

Four rows are re-runs published later the same night, after an exhausted account
balance killed four OpenCode runs in seconds. They used the same harness and
prompt as their passmates; only their timestamps differ.
