# PATCHWORK / Signal Goods

A small, custom DTG t-shirt storefront. Each order is a one-of-one front print generated from the customer’s name, mood, field note, and signal color.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` (or the port shown by Next).

## Payments and fulfillment

The app uses Stripe Checkout for payment and Prodigi Print API v4 for fulfillment.

- `POST /api/checkout` creates a Stripe Checkout Session when `STRIPE_SECRET_KEY` exists.
- Stripe collects a billing/shipping address and redirects to `/success?session_id=...`.
- `/api/checkout/confirm` verifies `payment_status === "paid"` with Stripe before creating a Prodigi order.
- `/api/webhooks/stripe` verifies Stripe signatures and repeats fulfillment for webhook reliability.
- Prodigi orders use `GLOBAL-TEE-BC-3001`, the front print area, `fillPrintArea`, and a server-rendered 2490×3510 PNG at `/api/artwork`.
- Prodigi `idempotencyKey` is set from the Stripe session, so a webhook and success-page confirmation cannot create duplicate orders.

Required Vercel environment variables:

```text
PRODIGI_API_KEY=...
PRODIGI_ENVIRONMENT=sandbox  # switch to live after launch checks
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

If Stripe is not configured, checkout intentionally becomes an explicit, non-charged Prodigi sandbox flow for QA. It cannot be used for live sales.

## Test the deployed app

1. Customize the tee and open the bag.
2. Continue to checkout with a test email.
3. With the current sandbox-only deployment, click “Complete sandbox payment” and confirm the order screen shows a Prodigi order ID.
4. In Stripe test mode, configure `STRIPE_SECRET_KEY`, set `STRIPE_WEBHOOK_SECRET`, redeploy, then use Stripe’s `4242 4242 4242 4242` test card.

## Production checklist

1. Create a Stripe account, add the production secret key, and register `https://YOUR_DOMAIN/api/webhooks/stripe` as a Checkout webhook for `checkout.session.completed`.
2. Set `PRODIGI_ENVIRONMENT=live` and replace the sandbox key with the live Prodigi key only after a paid Stripe test is verified.
3. Add a real domain, store order records in a durable database, and add an email provider for receipts/tracking updates.
4. Add tax/VAT handling, shipping-rate calculation, refund/cancellation workflows, privacy/terms pages, and fraud/rate-limit controls before selling publicly.
