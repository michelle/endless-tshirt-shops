# datetime.store

The present, printed: a made-to-order black tee carrying the exact millisecond a customer checked out.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Without Stripe credentials, the storefront and artwork preview still render, but the purchase endpoint returns a configuration error. Use Stripe test credentials and the Prodigi sandbox credentials in `.env.local` to exercise checkout and fulfillment.

## Verify the purchase path

1. Open `http://localhost:3000` and switch between fitted/unisex and sizes.
2. Click “buy the moment”; the server creates a Stripe Checkout Session.
3. Complete Checkout with a Stripe test card such as `4242 4242 4242 4242`.
4. Stripe returns to the success state. The return page calls `/api/fulfill` and creates a Prodigi sandbox order; the Stripe webhook at `/api/webhooks/stripe` provides the retry-safe background path. For full local fulfillment, set `SITE_URL` to a public HTTPS tunnel; Prodigi must be able to download the artwork URL.
5. Confirm the order in the Prodigi sandbox dashboard and inspect the Stripe session metadata for the timestamp, cut, and size.

## Environment variables

`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRODIGI_API_KEY`, and `SITE_URL` are required for a hosted checkout/fulfillment environment. The included production wiring targets `api.sandbox.prodigi.com`; switch that base URL to `api.prodigi.com` only after the live store is ready.

## Product decisions

- Stripe Checkout owns payment, shipping-address collection, and receipts.
- Prodigi v4 owns made-to-order printing. Fitted uses `A-WT-GD64000L`; unisex uses `A-MT-GD64000`.
- Artwork is generated server-side as a print-ready PNG so the timestamp printed by Prodigi matches the timestamp shown to the buyer.
- The return-page fulfillment call is paired with a signed Stripe webhook and a Prodigi idempotency key so fulfillment remains recoverable if the customer closes the browser.
