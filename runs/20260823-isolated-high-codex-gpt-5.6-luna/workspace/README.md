# datetime.store

The datetime.store rebuild is a small Next.js storefront for a made-to-order black tee printed with the current UTC datetime.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Set `STRIPE_SECRET_KEY` to a Stripe test-mode secret/restricted key and set `SP_AUTH` to a Scalable Press test key.
3. Run `npm install && npm run dev`.
4. Open `http://localhost:3000`, choose a fit and size, and click **Buy this timestamp**.
5. Complete Stripe Checkout with test card `4242 4242 4242 4242`, any future expiry, and any CVC/postal code.

The Stripe webhook route is `/api/webhooks/stripe`. For local fulfillment testing, run `stripe listen --forward-to localhost:3000/api/webhooks/stripe`, then set the printed `whsec_...` value as `STRIPE_WEBHOOK_SECRET`.

## Production flow

`POST /api/create-checkout-session` creates a Stripe Checkout Session with the selected fit, size, and timestamp in metadata. Stripe sends `checkout.session.completed` to the signed webhook. The webhook creates a 300-DPI PNG design, requests a Scalable Press quote, and submits the order only after payment is confirmed.

The current deployment is configured for Stripe test mode and Scalable Press test mode. Do not use those credentials for live customers.
