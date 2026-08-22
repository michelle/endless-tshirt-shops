# datetime.store

A tiny made-to-order storefront for a black t-shirt printed with the exact moment it was purchased. The frontend is static and the checkout/fulfillment workflow runs in Vercel Functions.

## Local development

```sh
npm install
npm start
```

`npm start` serves the storefront at `http://localhost:3000`. To exercise the Vercel Functions locally, use the Vercel CLI instead:

```sh
vercel dev
```

Set these environment variables in the Vercel project or a local `.env` file:

```sh
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
SP_AUTH=...
STRIPE_WEBHOOK_SECRET=whsec_... # optional but recommended for asynchronous fulfillment
APP_DRY_RUN=false
```

The only safe-to-expose variable is `STRIPE_PUBLISHABLE_KEY`; all other credentials are read only by server functions. `APP_DRY_RUN=true` skips Scalable Press order placement and is intended only for local verification.

## Customer flow

1. The browser renders a live timestamp and creates a PNG artwork payload at checkout.
2. `POST /api/create-checkout-session` uploads the artwork to Scalable Press and creates a Stripe Checkout Session with the design ID and garment selection in metadata.
3. Stripe-hosted Checkout collects payment and shipping address.
4. The success redirect calls `GET /api/complete`, which verifies the paid session, requests a Scalable Press quote, and places the order. `/api/webhook` handles the same fulfillment from `checkout.session.completed` for webhook-driven production operation.

For a Stripe test checkout, use card `4242 4242 4242 4242`, any future expiry, and any three-digit CVC. Scalable Press test credentials return test-mode design/order data.

## Launch checklist

- Add a current Stripe test/live secret key and publishable key to the Vercel project.
- Add `SP_AUTH` and confirm the selected Scalable Press product IDs and sizes are available in the target account.
- Configure a Stripe webhook for `checkout.session.completed` to `https://<deployment>/api/webhook` and set `STRIPE_WEBHOOK_SECRET`.
- Replace `APP_DRY_RUN=false` only after test checkout, quote, and order placement have been verified.
- Add a persistent store or queue for fulfillment idempotency before handling meaningful production volume. Stripe Session metadata plus an in-memory lock protects the common retry case but is not a substitute for durable state across cold starts.
