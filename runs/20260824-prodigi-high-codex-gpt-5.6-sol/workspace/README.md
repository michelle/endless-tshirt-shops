# datetime.store

A production-oriented rebuild of the original [datetime.store](https://github.com/michelle/datetime.store): one black, made-to-order t-shirt printed with the 13-digit Unix timestamp from the moment checkout begins.

## Architecture

- Next.js App Router storefront and server routes
- Stripe Checkout in test/sandbox mode for payment, address collection, and receipts
- Signed, immutable 4680×5790 PNG artwork generated on demand with Sharp
- Prodigi Print API v4 fulfillment (`GLOBAL-TEE-BC-6004` fitted and `GLOBAL-TEE-BC-3001` unisex)
- Stripe webhook fulfillment plus an idempotent success-page recovery path
- Prodigi `idempotencyKey` based on the Stripe Checkout Session, preventing duplicate orders on retries

## Local setup

Use Node 20 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with a Stripe test/sandbox restricted key, a Prodigi sandbox key, a random artwork signing secret, and `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.

For webhook testing:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the emitted `whsec_...` value into `STRIPE_WEBHOOK_SECRET`, restart the app, and use Stripe's standard successful test card `4242 4242 4242 4242` with any future expiry and any CVC.

## Verification

```bash
npm test
npm run lint
npm run build
```

The end-to-end sandbox check is:

1. Choose fitted/unisex and S–XL.
2. Select **Choose this moment** and note that the timestamp freezes.
3. Complete Stripe Checkout with the test card and a valid US shipping address.
4. Confirm the success page shows a Stripe-backed timestamp and a Prodigi `ord_...` fulfillment ID.
5. In Stripe, check the Checkout Session metadata (`style`, `size`, `timestamp`, `prodigi_order_id`).
6. In the Prodigi sandbox dashboard, check the matching merchant reference and front artwork.

## Launch checklist

The deployed demo is intentionally sandbox-only. Before accepting real customers:

1. Claim or replace the temporary Stripe sandbox, complete Stripe account activation, and configure a live restricted key with Checkout Session read/write access.
2. Register the production webhook at `https://YOUR_DOMAIN/api/stripe/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`; set its live signing secret.
3. Open a Prodigi live account, add billing, set an order pause/edit window, replace the sandbox API key/base URL with live credentials, and place a physical sample order.
4. Set `NEXT_PUBLIC_STORE_MODE=live`, point `NEXT_PUBLIC_SITE_URL` at the final HTTPS domain, and rotate `ARTWORK_SIGNING_SECRET` once before launch.
5. Re-price after a live quote, sales tax, refunds/reprints, and customer support. The original $22.50 price is configurable through `PRODUCT_PRICE_CENTS`.
6. Add a support address, privacy policy, terms, returns policy, shipping policy, and country-specific tax handling. The current checkout deliberately ships only to the US.
7. Configure Stripe receipt emails and add monitoring/alerting for webhook failures and Prodigi orders with issues.

## Operational assumptions

- One shirt per checkout, black only, free Budget shipping, US only.
- The timestamp is deliberately frozen immediately before the Checkout Session is created, not when payment finishes.
- Stripe is the order ledger; the Prodigi order ID is written back to Checkout Session metadata.
- The recovery page repeats fulfillment safely if a webhook is delayed. Prodigi's persistent idempotency key makes this duplicate-safe.
- Prodigi callbacks are logged for visibility but are not yet persisted in a separate order database.
