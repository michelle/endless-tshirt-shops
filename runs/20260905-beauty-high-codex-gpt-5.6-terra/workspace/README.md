# datetime.store

A one-of-one t-shirt store: each garment records the exact millisecond it was purchased.

## Stack

- Next.js 14 + Stripe Checkout
- Stripe webhooks create a print-on-demand order using Prodigi Print API v4
- `/api/artwork` creates a signed, 4680px-wide PNG on demand, so Prodigi can fetch a permanent order-specific asset without client uploads or a storage bucket.

## Environment

```sh
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
PRODIGI_API_KEY=...
PRODIGI_BASE_URL=https://api.sandbox.prodigi.com/v4.0
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
ARTWORK_SIGNING_SECRET=long-random-string
```

`PRODIGI_BASE_URL` deliberately defaults to the sandbox endpoint. Change it to `https://api.prodigi.com/v4.0` only after a live SKU, pricing, taxes, and fulfillment workflow have been verified.

## Test

1. Run `npm run dev`.
2. Select the tee options, capture a moment, and choose checkout.
3. Use Stripe's `4242 4242 4242 4242` card in Checkout.
4. Forward Stripe test webhooks locally with `stripe listen --forward-to localhost:3000/api/stripe-webhook` and set its signing secret.
5. The webhook submits an idempotent order to the configured Prodigi environment.

## Notes

The product is Bella+Canvas 3001 (`GLOBAL-TEE-BC-3001`) with a black, navy, white, or natural body; its current product details expose a `front` print area. The app purposefully only offers destinations supported by the checkout configuration. Add a durable order store before exposing customer-facing tracking or support tooling.
