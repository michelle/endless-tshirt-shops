# datetime.store

The timestamp tee, rebuilt as a Vite + React storefront with Stripe Checkout and Prodigi fulfillment.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

For local checkout sessions, set `STRIPE_SECRET_KEY`, `PRODIGI_API_KEY`, and `PRODIGI_BASE_URL` in `.env.local`. The production Stripe webhook must be configured with `STRIPE_WEBHOOK_SECRET`.

## Order flow

1. The browser freezes the live timestamp when the customer chooses “Capture this moment”.
2. `/api/create-checkout-session` creates a Stripe-hosted Checkout Session and stores the timestamp, fit, size, SKU, and a public artwork URL in Stripe metadata.
3. Stripe sends `checkout.session.completed` to `/api/stripe-webhook` after payment.
4. The webhook submits a `GLOBAL-TEE-BC-3001` order to Prodigi’s v4 sandbox API with the customer’s shipping address and the rendered PNG from `/api/artwork`.

## Production handoff

- Replace the sandbox `PRODIGI_BASE_URL` with `https://api.prodigi.com` only after the live Prodigi account, product pricing, and shipping policy are reviewed.
- Claim or replace the temporary Stripe sandbox before its expiry; its test credentials are intentionally not suitable for a permanent business account.
- Add a durable order store if customer service needs searchable order history or if fulfillment status should be shown in the storefront. Prodigi’s API already supports callbacks for this next step.
