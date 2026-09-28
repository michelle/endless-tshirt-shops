# Nightmark

Personalized constellation tee storefront. A customer enters a name, date, place, and short line. The same deterministic SVG is used in the live preview and rendered as a 3000 × 4000 transparent PNG for Prodigi DTG printing.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add Stripe test secret and a `checkout.session.completed` webhook endpoint at `/api/webhook`. Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhook` and use its emitted `whsec_...` as `STRIPE_WEBHOOK_SECRET`. Add your sandbox Prodigi key and a random `ART_SIGNING_SECRET` (for example, `openssl rand -hex 32`). Set `NEXT_PUBLIC_SITE_URL` to the reachable site URL; Prodigi must fetch its artwork there.

Stripe Checkout collects card payment and a US shipping address. The webhook verifies Stripe's signature, retrieves the Checkout Session, checks `payment_status=paid` and the fixed amount, then creates a Prodigi order using the Session ID as Prodigi's `idempotencyKey`. Checkout is unavailable if Stripe credentials are missing. Prodigi is sandbox by default; live orders require `PRODIGI_MODE=live` and a live key. No shirts are sent to Prodigi from the success page.

## Production checklist

- Configure Stripe secret key and webhook secret in Vercel, register `https://<domain>/api/webhook` for `checkout.session.completed` (and `checkout.session.async_payment_succeeded` if adding delayed methods), and redeploy.
- Test Stripe's `4242 4242 4242 4242` card and confirm one order in Prodigi sandbox. Test a declined card and webhook retries.
- Get a physical sample and verify print placement and color. Switch to a Prodigi live key only after sampling.
- Configure sales tax collection and applicable registrations, a support email, legal policies, and shipping/return details before accepting live payments.
- Add an order database and support dashboard for operational visibility; Prodigi's idempotency key prevents duplicate fulfillment on webhook retries.
