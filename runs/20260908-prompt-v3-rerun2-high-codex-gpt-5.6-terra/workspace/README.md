# Signal Foundry

A custom DTG t-shirt store. Stripe Checkout is the payment boundary; fulfilled Stripe checkout sessions submit exactly one Prodigi order using the Stripe session ID as the Prodigi idempotency key.

## Local setup

Copy `.env.example` to `.env.local`, add Stripe test credentials, the supplied Prodigi sandbox key, then run `npm install` and `npm run dev`.

Use `stripe listen --forward-to localhost:3000/api/webhook/stripe` to test the webhook. In Stripe test mode, use card `4242 4242 4242 4242` with any future expiration, CVC, and ZIP.

## Production configuration

Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRODIGI_API_KEY`, `PRODIGI_BASE_URL=https://api.prodigi.com`, and `APP_URL` in the hosting provider. Configure a Stripe `checkout.session.completed` webhook at `https://YOUR_DOMAIN/api/webhook/stripe`.

The fallback fulfillment endpoint on the success page independently rechecks `payment_status === "paid"`; it cannot submit an unpaid order. Prodigi idempotency prevents duplicate fulfilment if both the webhook and the success page fire.
