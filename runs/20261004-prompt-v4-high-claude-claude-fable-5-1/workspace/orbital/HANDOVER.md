# Orbital — handover notes (2026-10-04)

## Live store
- **URL:** https://temporary-sonic-agate-w4zxmnu.vercel.app
- **Admin (recent Prodigi orders):** https://temporary-sonic-agate-w4zxmnu.vercel.app/admin?key=e30f0a17a5136dea29d6eb99
- **Health:** https://temporary-sonic-agate-w4zxmnu.vercel.app/api/health

### ⚠ Claim the deployment (expires 16:01 local / 23:01 UTC on 2026-10-04)
It is an anonymous Vercel "temporary" deployment (no login was available). Claim it into your Vercel
account here, and it becomes a normal project: **https://vercel.com/claim-deployment?code=20924f21-095d-4ca2-8608-28f7c8d06303**

If it has already expired: run `scripts/deploy-temporary.sh --fresh` from the project (needs
`vercel` CLI on PATH). It deploys a new temporary URL, creates a matching Stripe webhook endpoint,
updates `.env.local`, and redeploys. Then claim the new link it prints. Or `vercel login` and
`vercel --prod` to deploy into your own account (set the env vars from `.env.local` in the project).

## Stripe (claimable sandbox, created for this store)
- Account: acct_1UMojzBamWQyHs4e (sandbox, expires 2026-10-11 unless claimed)
- **Claim it:** https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVU1vanpCYW1XUXlIczRlLDE3OTE3NTQ4NzUv100Ty8lQl2a
- Keys: `orbital/.env.local` (secret key is a restricted claimable-sandbox key, `rkcs_test_…`)
- Webhook endpoint: we_1UMxTzBamWQyHs4ebNT5Nrvm → /api/webhooks/stripe
  (events: checkout.session.completed, checkout.session.async_payment_succeeded)
- The Stripe CLI on this machine is logged into this sandbox (`stripe config --list`).

## Prodigi
- Sandbox key from $PRODIGI_API_KEY, base https://api.sandbox.prodigi.com (orders are accepted but never printed).
- SKU GLOBAL-TEE-GIL-64000 (Gildan 64000), front print area 4665×5844 px; artwork sent as transparent PNG via `/api/art?d=…&sig=…`.
- Verified end-to-end on this deployment (Playwright, Stripe test card 4242…): Prodigi order ord_1177218 was
  created by the webhook alone (browser blocked from the order page) for session
  cs_test_a1vc7knvGIQgMEaScTIiSec5Z3kAfSgcKqdIrhIEAoiyKY0mz9IvzNk64j; Prodigi downloaded the print file
  (downloadAssets: Complete). Two abandoned (unpaid) sessions produced no Prodigi order.
- Re-run the browser test: `cd scripts && npm i playwright && URL=<store url> node e2e-checkout.js`.

## Code
- Project: `orbital/` (Next.js 16, TypeScript, Tailwind). See README.md for architecture and the production checklist.
- Secrets: `orbital/.env.local` and `.secrets/` (both git-ignored / not for commit).
- Sample renders: `orbital/samples/`.
