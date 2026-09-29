# Our Orbit

A personalized DTG shirt store built with Next.js, Stripe Checkout, and Prodigi Print API. Customers enter names, a place, a date, and a message. Those details deterministically generate a unique constellation and a 4680 × 5790 transparent PNG for the front of a Bella+Canvas 3001 tee.

## Payment and fulfillment

1. `POST /api/checkout` validates the design server-side and creates a Stripe Checkout Session for one $39 shirt plus $6 U.S. shipping. Checkout collects a U.S. address and phone number.
2. Stripe sends `checkout.session.completed` or `checkout.session.async_payment_succeeded` to `POST /api/webhook`.
3. The webhook verifies Stripe's signature, retrieves the Session from Stripe, and requires `payment_status === 'paid'` before posting a Prodigi order.
4. The Prodigi order uses a stable idempotency key derived from the Stripe Session ID. Prodigi downloads the high-resolution PNG at `/api/print/[sessionId]`, which also requires a paid Session.
5. The returned Prodigi order ID is saved in Stripe Session metadata and shown on the success page after processing.

Prodigi's sandbox never prints or ships. The checkout endpoint rejects a live Stripe key paired with sandbox Prodigi, or a test Stripe key paired with live Prodigi. It also rejects checkout if the webhook secret or Prodigi key is missing.

## Local setup

```sh
npm install
cp .env.example .env.local
npm run dev
```

Set `STRIPE_SECRET_KEY` to a Stripe **test** secret key, `STRIPE_WEBHOOK_SECRET` to a test webhook signing secret, `PRODIGI_API_KEY` to your Prodigi sandbox key, `PRODIGI_ENV=sandbox`, and `SITE_URL` to the public base URL used for webhooks and print assets. For local webhook testing, run `stripe listen --forward-to localhost:3000/api/webhook`, then use its `whsec_...` value in `.env.local` and restart the dev server. Test Stripe Checkout with card `4242 4242 4242 4242`, any future expiration date, and any CVC. The sample address must be in the U.S.

## Vercel setup

Set the five environment variables above on the production deployment. Register `https://YOUR_DOMAIN/api/webhook` as a Stripe webhook endpoint for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Use the signing secret from that exact endpoint; Stripe CLI secrets are only for local forwarding. Redeploy after changing environment variables.

## Production launch checklist

- Complete a Stripe test purchase and confirm one Prodigi sandbox order and a successful asset download. Repeat the webhook to verify it creates only one order.
- Order a physical sample in Prodigi live mode and inspect print placement, size, colors, and garment quality.
- Configure Stripe live credentials and webhook signing secret, a Prodigi live API key, and `PRODIGI_ENV=live` together. Confirm pricing, shipping margin, and applicable sales tax.
- Add a support address, shipping/returns/privacy terms, operational alerts for failed webhooks and Prodigi order issues, and shipment status notifications before accepting public orders.

## Current scope

One shirt per checkout, black tee, sizes S–2XL, U.S. shipping only. The constellation is original generative artwork based on customer details, not an astronomical chart. The mockup is illustrative; verify physical placement with a sample.
