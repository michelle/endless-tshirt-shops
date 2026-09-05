# datetime.store

A production-ready rebuild of the original `datetime.store`: freeze the current Unix timestamp, preview it on a shirt, pay through Stripe Checkout, and submit the unique print job to Prodigi.

## Stack

- Next.js App Router and TypeScript
- Stripe Checkout in test mode
- Prodigi Print API v4 sandbox
- Sharp for deterministic 2490×3510 transparent print artwork
- Vercel hosting and serverless functions

## Local setup

Copy `.env.example` to `.env.local`, fill in the values, then run:

```bash
npm install
npm run dev
```

For local webhook testing:

```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

Use Stripe test card `4242 4242 4242 4242`, any future expiry, and any CVC.

## Fulfillment design

Checkout stores the frozen timestamp, garment variant, quantity, and immutable artwork URL in Stripe metadata. Both the Stripe webhook and the success-page status request can trigger fulfillment. Prodigi receives the Stripe Checkout Session ID as its idempotency key, preventing duplicate print orders if those paths race or retry.

Prodigi is deliberately pointed at `api.sandbox.prodigi.com`; switch the API base URL and credentials only after product samples, tax, returns, shipping, and operational monitoring are ready for live orders.
