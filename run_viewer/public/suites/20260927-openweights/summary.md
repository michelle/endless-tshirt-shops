# Prompt v3 — seven open-weight models

Seven open-weight models, one per row, given the same prompt: build and deploy a
working t-shirt store. **Nothing here has been audited.** Every status reflects
what the harness recorded and what the agent claimed about its own work, not
verified behaviour. Treat the reports as evidence to check, not as findings.

| Model | Harness | Status | Minutes |
| --- | --- | --- | --- |
| Kimi · kimi-for-coding (K2.8) | Kimi Code | Deployed · unaudited | 29 |
| Kimi · k3 | Kimi Code | Deployed · unaudited | 25 |
| Kimi · k3 | OpenCode | Deployed · unaudited | 40 |
| DeepSeek · deepseek-v4-pro | OpenCode | Deployed · unaudited | 34 |
| MiniMax · minimax-m3 | OpenCode | Deployed · unaudited | 62 |
| Qwen · qwen3.8-max | OpenCode | Never deployed · unaudited | 36 |
| Z.ai · glm-5.3 | OpenCode | Aborted on question · URL not captured | 53 |

## Four of seven built the same shirt

Without seeing each other's work, four models converged on the same concept: a
personalised celestial print tied to a moment the customer chooses.

- **k3** built *StarMark*, a star chart computed from real local sidereal time,
  with the moon phase of that night drawn beside the coordinates.
- **k3 again, on a different harness**, built *Sidereal* — 2,887 stars from the
  Yale Bright Star Catalog, 150 constellation segments, stereographic projection.
- **deepseek-v4-pro** built *Lunaria*, an astronomically computed moon phase for
  a chosen date.
- **minimax-m3** built *StarMap Tee*, a star field plus moon phase by Conway's
  algorithm.

Only **kimi-for-coding** went elsewhere, with *DEFINING.ME*: the customer types a
name and gets a typeset dictionary entry — headword, part of speech, example
sentence, edition number.

The prompt asks for an original theme that takes advantage of per-customer
printing, and "the night sky on your date" is a genuinely good answer to it. But
four independent arrivals at the same answer says more about shared priors than
about any one model's originality, and it is the clearest pattern in this suite.

## The same weights on two harnesses

`k3` ran twice: once on its native Kimi CLI, once through OpenCode. Both
deployed, and both built a star map — the concept was stable across scaffolds.
The wall clock was not: **25 minutes native against 40 through OpenCode**, a 60%
difference on identical weights. That pair is the only thing here that separates
scaffold cost from model capability, and it is why it was run.

## What "succeeded" does not mean

**qwen3.8-max finished without shipping anything.** The harness recorded it as
succeeded and published 58 files of store, but there is no deployment URL, no
project, and no storefront host anywhere in its private log. Its final words are
a note about fixing a vignette gradient on a mockup. A run can satisfy the
harness and still leave nothing a customer could buy, which is the whole reason
this benchmark checks what shipped rather than what was reported.

**glm-5.3 is recorded as failed but did deploy.** It built a store, put it live,
and then stopped to ask for a human to type a test card for the one step it could
not do alone. The harness runs non-interactively and denies questions, so the
session ended there. Its report is a single mid-sentence line, so no URL was
captured, and the row understates what it achieved.

## Credentials written to disk

**kimi-for-coding wrote its payment credentials into three files** in its own
workspace — a sandbox key, a webhook secret, and an `.env.local`. **k3 wrote
none**, on the same provider and the same prompt. The values were replaced with
a placeholder before publication and each substitution is recorded in that run's
metadata; the originals are kept privately. This is a difference in handling
between two models from one vendor, not a harness artifact.

## Provenance

All seven ran `prompts/prompt-v3.md` at reasoning effort `high`, each in its own
Vercel project and Stripe sandbox.

Four rows (`kimi-for-coding`, both `k3` runs, `glm-5.3`) come from the original
2026-09-27 suite. Three (`deepseek-v4-pro`, `qwen3.8-max`, `minimax-m3`) are
re-runs from 2026-09-28, after their first attempts died on harness and provider
faults rather than on the task: an upstream rejection of the reasoning-effort
parameter, a session interrupted by a concurrent command, and an unexplained
signal. Those three therefore ran on a slightly later harness — OpenCode moved to
a private server per run, and DeepSeek dropped its `#high` variant — so their
wall-clock and failure surface are not strictly comparable to the first four.
Every run records the provider CLI version it used.
