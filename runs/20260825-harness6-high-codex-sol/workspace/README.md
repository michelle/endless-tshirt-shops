# datetime.store

A modern rebuild of the original datetime.store: choose a black tee, freeze the current Unix timestamp at checkout, pay through Stripe Checkout, and fulfill the one-of-one print through Prodigi.

## Local development

1. Copy `.env.example` to `.env.local` and fill in Stripe test and Prodigi sandbox credentials.
2. Run `npm install` and `npm run dev`.
3. Open `http://localhost:3000`.

Use Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC, and a supported US/CA/GB/AU/NZ shipping address.

## Fulfillment flow

Stripe Checkout collects payment and shipping details. `checkout.session.completed` is verified at `/api/webhooks/stripe`, then submitted to Prodigi with the Stripe Session ID as its idempotency key. The success page also retries the idempotent fulfillment call so paid orders recover from webhook delivery delays. Prodigi fetches a signed, 300 DPI transparent PNG from `/api/artwork`.

## Commands

- `npm run dev` — local development
- `npm run test` — unit tests
- `npm run lint` — static analysis
- `npm run build` — production build
