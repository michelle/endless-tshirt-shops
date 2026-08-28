# datetime.store

A production-oriented rebuild of the original datetime.store: a live Unix-millisecond t-shirt configurator with Stripe Checkout and Prodigi print-on-demand fulfillment.

## Local development

1. Copy `.env.example` to `.env.local` and add Stripe test and Prodigi sandbox credentials.
2. Run `npm install`.
3. Run `npm run dev` and open `http://localhost:3000`.
4. Use Stripe's test card `4242 4242 4242 4242`, any future expiry, and any CVC.

To test webhooks locally, run:

```sh
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Add the printed `whsec_...` value to `STRIPE_WEBHOOK_SECRET`, then restart the dev server.

## Fulfillment flow

Checkout metadata records the chosen fit, size, timestamp, and site origin. After Stripe reports a paid Checkout Session, the signed webhook creates an idempotent order in Prodigi's sandbox using a generated public PNG at `/api/artwork/[timestamp]`. The success page also retries fulfillment safely after verifying payment with Stripe.

The fitted shirt maps to Prodigi SKU `GLOBAL-TEE-BC-6004`; unisex maps to `GLOBAL-TEE-BC-3001`. Both use black, front-print variants.

## Production cutover

Replace sandbox credentials with a claimed Stripe account's live key and a Prodigi live key, set `PRODIGI_API_BASE_URL=https://api.prodigi.com/v4.0` and `NEXT_PUBLIC_SHOP_MODE=live`, register a live Stripe webhook, confirm taxes and shipping countries, and place physical sample orders for every size and fit before opening sales.
