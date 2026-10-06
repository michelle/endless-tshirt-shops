# Dayprint — deployment handoff (2026-10-06)

## Live store (anonymous Vercel deployment)
- Store URL:   https://temporary-prompt-dune-kmyguub.vercel.app
- Claim URL:   https://vercel.com/claim-deployment?code=101fea52-9c61-4205-a128-94fee0634527
- Expires:     2026-10-06 01:41 UTC unless claimed. Claiming moves it into your Vercel account permanently.
- If it has expired: `npm run deploy -- --fresh` (new URL, re-wires the Stripe webhook automatically).

## Stripe (claimable sandbox, test mode)
- Account:     acct_1UNLKiLwuVeRpgum
- Claim URL:   https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVU5MS2lMd3VWZVJwZ3VtLDE3OTE4NDk5OTYv100SskwYLyo
- Sandbox expires 2026-10-13 unless claimed. Keys are in `.env` (never committed) and `.secrets/stripe.toml`.
- Webhook endpoint: we_1UNMRuLwuVeRpgumaYSmmEX2 -> /api/stripe-webhook (checkout.session.completed, async_payment_*)

## Prodigi (sandbox)
- Base URL: https://api.sandbox.prodigi.com/v4.0, key from $PRODIGI_API_KEY (also in `.env`).
- Test orders created during verification: ord_1177851, ord_1177855, ord_1177865 (asset download confirmed Complete on ord_1177851).

## Test card
4242 4242 4242 4242, any future expiry, any CVC, any ZIP.
