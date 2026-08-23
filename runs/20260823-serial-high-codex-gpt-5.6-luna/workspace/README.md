# datetime.store

A small, deliberately minimal shop for a t-shirt printed with the exact UTC timestamp at checkout.

## Run locally

```sh
npm install
vercel dev
```

Set these environment variables in Vercel (or a local `.env`):

```text
STRIPE_SECRET_KEY=rkcs_test_...
STRIPE_WEBHOOK_SECRET=whsec_... # optional locally; see fulfillment note below
SP_AUTH=...
PUBLIC_SITE_URL=http://localhost:3000
```

The available Stripe sandbox test card is `4242 4242 4242 4242`, with any future expiry and CVC.

## Flow

1. The browser renders a live timestamp and creates a transparent PNG containing that timestamp.
2. `/api/prepare-order` sends the PNG to Scalable Press and receives a design ID.
3. `/api/create-checkout-session` creates a $22.50 Stripe Checkout Session with the design, fit, and size in metadata.
4. After payment, `/api/stripe-webhook` quotes and places the order with Scalable Press. The success page also calls `/api/complete-order` as a fallback for environments where a webhook has not been registered yet.

## Production checklist

- Replace the temporary Stripe sandbox secret before 2026-08-30 with a permanent Stripe live/test key as appropriate.
- Register `https://<your-domain>/api/stripe-webhook` in Stripe and set `STRIPE_WEBHOOK_SECRET` in Vercel. Keep the success-page fallback, but treat the webhook as the source of truth.
- Confirm Scalable Press product availability, pricing, tax/shipping behavior, and the final DTG artwork proof for the selected products.
- Add persistent order storage, rate limiting, alerting, and a retry queue before accepting meaningful volume. Stripe Session metadata is used for state in this small deployment.
- Add legal pages, refund/return policy, privacy/terms, and a verified customer-support email.
