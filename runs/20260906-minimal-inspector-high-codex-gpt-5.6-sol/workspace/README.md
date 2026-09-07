# datetime.store rebuild

A modern rebuild of the original datetime.store: a single-product storefront for a black t-shirt printed with the Unix timestamp from the exact millisecond checkout begins.

## Local development

Copy `.env.example` to `.env.local`, provide Stripe test and Prodigi sandbox credentials, then run:

```bash
npm install
npm run dev
```

Stripe Checkout collects payment and a US shipping address. The signed webhook and the success-page recovery endpoint both run the same idempotent fulfillment routine, which creates a Prodigi sandbox order using the active Bella + Canvas 6004 (fitted) or 3001 (unisex) product.

## Stripe webhook

Point a Stripe test-mode webhook at `/api/webhooks/stripe` and subscribe to `checkout.session.completed`. Store its signing secret as `STRIPE_WEBHOOK_SECRET`.

## Test card

Use Stripe's standard successful test card `4242 4242 4242 4242`, any future expiry, any CVC, and a US shipping address. Prodigi is intentionally configured for sandbox, so no item is printed or shipped.
