# Signal Atlas

A personalized DTG t-shirt storefront. Customers configure a deterministic orbital-map design, pay in Stripe Checkout, and a verified paid event creates an idempotent Prodigi order.

## Local setup

Copy `.env.example` to `.env.local`, add Stripe test credentials and the Prodigi sandbox key, then run `npm run dev`.

Forward Stripe test events to `/api/webhooks/stripe` and set the printed webhook secret as `STRIPE_WEBHOOK_SECRET`. The fulfillment endpoint checks the Checkout Session's `payment_status` before calling Prodigi.

## Fulfillment safety

- Prodigi is never called from the browser or checkout-creation route.
- The webhook signature is verified using Stripe's SDK.
- Fulfillment re-fetches the Checkout Session and requires `payment_status === "paid"`.
- The Stripe Session ID is used as Prodigi's merchant reference and idempotency key.
- Artwork URLs carry an HMAC signature and render a transparent 4680×5790 PNG.
