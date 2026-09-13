# Prompt v3 — harness smoke test

Two runs, not a comparison. This suite exists to prove the harness still works
after a round of refactoring, so it carries one model per provider rather than
the usual seven, and it is marked incomplete in the viewer.

| Model | Status | Seconds | Tool calls |
| --- | --- | --- | --- |
| Codex · gpt-5.6-terra | Deployed · payment blocked | 473 | 28 |
| Claude · claude-sonnet-5 | Paid E2E · 1 completed order | 1456 | 108 |

## What the runs did

**gpt-5.6-terra** built *Tiny Triumphs*, a customisable DTG tee shop: the
customer enters a personal "tiny triumph" with a name, badge, colour and size,
and sees a live preview. It never invoked the Stripe CLI, so it had no payment
credentials, and it shipped a fail-closed integration: checkout returns a
"temporarily unavailable" response rather than risking fulfillment without
verified payment, with setup instructions for supplying the keys. Only a
verified `checkout.session.completed` webhook would submit to Prodigi. This
matches its behaviour on 2026-09-11, where it also chose not to reach for the
CLI.

**claude-sonnet-5** built *Cipher Tees*, where a phrase of up to 28 characters
deterministically drives a radial pattern — the same phrase always renders the
same design, which is a real argument for DTG rather than a decorative one. It
provisioned its own Stripe sandbox through the CLI, priced server-side, gated
Prodigi submission on a verified signature and `payment_status === "paid"`, and
keyed the Prodigi order by Checkout Session ID so a retried webhook cannot
double-print. It rendered the print file from the same component tree as the
browser preview. It reports testing this end to end against both sandboxes,
with Prodigi fetching the art and marking order `ord_1171949` complete.

Neither result has been audited. The status column repeats what each run
reported plus what the runner recorded; no inspector pass, artwork recovery or
independent payment verification has been done, and no artwork is archived.

## Known limitations of this suite

- **The two runs do not share a base commit.** Terra ran at `254ec880` and
  Sonnet at `313fc71b`, because a publication bug was fixed between them. The
  prompt is byte-identical across both (`3086837…`), but this is not a
  controlled comparison.
- **Terra's publication was recovered by hand.** Its run succeeded, then
  publication failed: switching the checkout to `benchmark-results` deleted
  `scripts/check-run-artifacts` from disk before it could run, because that
  branch carries only run artifacts. The gate was then run from `main`'s copy
  against the staged artifacts and passed; nothing was bypassed. Publication now
  happens in a throwaway worktree instead.
- One model per provider, chosen for speed and cost, so nothing here says
  anything about the other five.
