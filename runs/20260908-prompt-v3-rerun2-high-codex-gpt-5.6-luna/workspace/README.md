# Signal Bloom

Signal Bloom is a one-of-one custom DTG t-shirt store. Customers turn a short phrase into a generated signal print, choose an ink tone, shirt color, and size, then pay through Stripe Checkout.

## Architecture

- Static storefront: `index.html`, `styles.css`, `app.js`
- `api/create-checkout.js`: validates the client cart and creates a Stripe Checkout Session with server-owned pricing
- `api/stripe-webhook.js`: verifies Stripe signatures and only submits to Prodigi after a paid checkout event
- `api/artwork.js`: generates a print-ready PDF asset for the phrase/style/ink combination
- Prodigi product: `GLOBAL-TEE-GIL-64000`, front print, `fitPrintArea`, sandbox API

## Required environment variables

Production needs:

```text
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PRODIGI_API_KEY=...
PUBLIC_APP_URL=https://your-domain.example
```

`PRODIGI_API_KEY`, `PRODIGI_ENVIRONMENT=sandbox`, and `PUBLIC_APP_URL` are already set on the deployed benchmark project. Stripe credentials were not available in the build environment and must be added before checkout can start.

## Test locally

```bash
npm run check
vercel dev
```

With Stripe configured, run `stripe listen --forward-to http://localhost:3000/api/stripe-webhook`, use card `4242 4242 4242 4242`, any future expiry, and any 3-digit CVC. The Stripe webhook should log the resulting Prodigi sandbox order. Sandbox orders do not charge or ship.

## Production checklist

1. Add live Stripe keys and create a webhook endpoint for `checkout.session.completed` and `checkout.session.async_payment_succeeded` at `/api/stripe-webhook`.
2. Switch `submitToProdigi()` from `api.sandbox.prodigi.com` to `api.prodigi.com` and replace the Prodigi sandbox key with the live key.
3. Confirm live SKU variants, pricing, tax, shipping countries, returns, privacy, and customer email/notification handling.
4. Add durable order storage and an operational retry/dead-letter path around webhook fulfillment before processing real volume.
