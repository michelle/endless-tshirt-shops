# datetime.store

A production rebuild of the wonderfully unnecessary 2017 datetime.store: choose a black shirt, freeze the current Unix timestamp, pay through Stripe Checkout, and create a print-on-demand order in Prodigi.

## How it works

- Next.js 16 App Router on Vercel
- Stripe-hosted test checkout collects payment and shipping details
- A signed Stripe webhook and the success-page fallback both call the same idempotent fulfillment function
- Prodigi v4 sandbox orders use the Gildan 64000 unisex or 64000L fitted t-shirt in black
- A public server-rendered 4665×5844 PNG endpoint produces the exact timestamp artwork Prodigi downloads
- The Stripe Checkout Session stores the Prodigi order ID after fulfillment, while Prodigi's idempotency key prevents duplicate orders during retries

## Local setup

Copy `.env.example` to `.env.local`, add Stripe test and Prodigi sandbox credentials, then run:

```bash
npm install
npm run dev
```

For local webhook testing, forward Stripe events to `http://localhost:3000/api/stripe/webhook` and use the reported signing secret.

## Verification

```bash
npm run build
npm run lint
```

Use Stripe test card `4242 4242 4242 4242`, any future expiration, and any CVC. Completed checkouts create sandbox-only Prodigi orders; they do not print or ship a real shirt.
