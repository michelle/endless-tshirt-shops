# datetime.store

A rebuilt, one-product timestamp t-shirt shop. The live timestamp freezes when
Stripe Checkout is created, and the paid checkout is sent to Prodigi for
print-on-demand fulfillment.

## Run locally

```sh
npm install
cp .env.example .env.local
npm run dev
```

Set `STRIPE_SECRET_KEY` and `PRODIGI_API_KEY` in `.env.local`. Keep
`PRODIGI_LIVE=false` while testing. The checkout uses Stripe-hosted Checkout;
use Stripe's `4242 4242 4242 4242` test card with any future expiry, CVC, and
US ZIP code.

## Fulfillment and webhooks

`/api/fulfill` verifies the Checkout Session is paid before submitting the
matching Prodigi order. Prodigi's idempotency key is the Stripe Checkout
Session ID, so retries return the existing order rather than duplicate a
shirt. The success page triggers this as an immediate customer-facing
confirmation; `/api/stripe-webhook` is the durable fallback.

For a live launch, add a Stripe webhook endpoint for
`checkout.session.completed` at `/api/stripe-webhook`, copy its signing secret
into `STRIPE_WEBHOOK_SECRET`, switch to live Stripe and Prodigi credentials,
and set `PRODIGI_LIVE=true`.
