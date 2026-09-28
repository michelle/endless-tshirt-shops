# Prompt v3 — three models released in a fortnight

Every model here shipped on 2026-09-22. **Nothing has been audited.** Each status
reports what the harness recorded and what the agent claimed about its own work.

| Model | Status | Minutes | Files published |
| --- | --- | --- | --- |
| Claude · claude-opus-5-5 | Deployed · unaudited | 27 | 75 |
| OpenAI · gpt-6-sol | Deployed · no payment integration · unaudited | 11 | 22 |
| OpenAI · gpt-6-luna | Deployed · no payment integration · unaudited | 7 | 9 |

## Two of the three skipped the hard half

The prompt says to select and integrate a payment provider, and the environment
deliberately names none: no variable, path or `PATH` entry says which CLI is
prepared, so the agent has to go looking. That search is a real part of the task.

**gpt-6-sol did not find it** and says so plainly — "No Stripe credentials were
available, so the payment button reports that setup is pending." It shipped a
storefront with a fail-closed checkout that refuses to fulfil without verified
payment, which is the correct response to what it believed, and finished in 11
minutes.

**gpt-6-luna did not find it either**, but its report opens by saying Stripe
Checkout and a signed, payment-gated fulfilment webhook "are implemented". Its
own Gaps section then concedes that "checkout cannot accept payment until the
Stripe keys and webhook are configured". The code paths exist; the integration
does not. It shipped nine files in seven minutes.

Neither is slow work done quickly. Both are a smaller job: build the storefront,
skip payment and fulfilment. Read the minutes column against that, not as speed.

The same thing happened to `gpt-5.6-terra` in the 2026-09-13 smoke suite, which
also never invoked the payment CLI. Three Codex-family runs, three failures to
discover it.

**claude-opus-5-5 did the whole job** — provisioned its own sandbox, wired
payment-gated fulfilment, and published 75 files in 27 minutes.

## Credentials written to disk

`claude-opus-5-5` wrote its payment credentials into two files in its workspace,
under a `.secrets/` directory: the provisioned Stripe profile, and a webhook
secret minted during the run. Both were replaced with a placeholder before
publication and are recorded in that run's metadata; the originals are kept
privately.

The two OpenAI runs leaked nothing, but only because they never obtained
credentials to leak. That is not evidence of better handling.

## Themes

`gpt-6-sol` built **Nightmark** and `gpt-6-luna` built **Night Atlas**, both
constellation tees personalised by date, place and a short dedication — the same
concept six of the ten models in this benchmark arrived at independently.

`claude-opus-5-5` did not. **SPECIMEN** invents a moth, butterfly or beetle in
honour of a person or pet, laid out as a page from an old field guide: a Latin
name built from theirs, habitat, diet, a "call", and three numbered
distinguishing marks. It is one of only two designs across the whole benchmark
that escaped the night sky.

## Provenance

All three ran `prompts/prompt-v3.md` at reasoning effort `high`, each in its own
Vercel project and payment sandbox, on their vendors' native harnesses.

Reaching `gpt-6-sol` and `gpt-6-luna` at all required upgrading the Codex CLI to
0.157.1. Older clients are refused those models with an error blaming the ChatGPT
account rather than the client version, which is why every run now records the
provider CLI version it used.
