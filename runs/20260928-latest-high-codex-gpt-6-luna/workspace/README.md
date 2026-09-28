# Night Atlas

Personalized DTG t-shirt storefront. Buyers customize an original constellation-style print with a place, dedication, coordinates, and date. Stripe Checkout collects payment and the signed webhook submits paid orders to Prodigi.

## Live preview

https://benchmark-20260928-latest-high-code-silk.vercel.app

The storefront and artwork rendering are deployed. Checkout is intentionally unavailable until a Stripe account is connected.

## Enable test checkout

1. Create or use a Stripe account and copy its **test mode secret key** (`sk_test_…`).
2. Add `STRIPE_SECRET_KEY` to this Vercel project's **Production** environment.
3. In Stripe, add a webhook endpoint at `https://benchmark-20260928-latest-high-code-silk.vercel.app/api/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
4. Copy the endpoint's signing secret (`whsec_…`) into Vercel as `STRIPE_WEBHOOK_SECRET`.
5. Redeploy the Vercel project so the new environment values are active.
6. Buy a tee with Stripe test mode. Use Stripe's test card `4242 4242 4242 4242`, any future expiry, and any CVC. Use a real-looking shipping address in one of the supported countries.
7. Confirm the webhook succeeded in Stripe's event log, then confirm the order in the Prodigi sandbox dashboard. Sandbox orders do not print or ship.

The supplied `PRODIGI_API_KEY` is stored as a sensitive Production environment variable. The app currently targets Prodigi's sandbox API. Duplicate Stripe webhook deliveries use the Stripe Checkout Session ID as the Prodigi idempotency key.

## Before taking real orders

- Replace the Prodigi sandbox API host in `api/webhook.js` with the live host only after switching to a live Prodigi key and confirming the product, sizes, print area, shipping destinations, and pricing.
- Add Stripe live keys and a live webhook endpoint; verify receipts and refunds.
- Set a tax strategy. Checkout currently does not calculate or collect sales tax, and the listed price/shipping amount may need to change based on actual Prodigi costs and destination.
- Add an order support contact, customer order status/notification flow, privacy/returns policies, and a persistent order record/reconciliation process.
- Test real product samples and international shipping before public launch.

## App structure

- `public/index.html` — storefront, customization form, preview, and product presentation
- `api/artwork.js` — deterministic custom artwork as PNG; preview at 1200×1500 and print file at 4665×5844
- `api/checkout.js` — Stripe-hosted Checkout Session creation
- `api/webhook.js` — signature verification and paid-order submission to Prodigi sandbox
