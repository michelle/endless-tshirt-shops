# datetime.store

A production-oriented rebuild of the original one-product timestamp tee shop. The exact Unix timestamp (in milliseconds) is captured when checkout starts, paid through Stripe Checkout, rendered into print-ready artwork, and sent to Scalable Press.

Current sandbox deployment: <https://benchmark-20260823-isolated-high-co.vercel.app>

## Local setup

1. Use Node 20.18+ and run `npm install`.
2. Copy `.env.example` to `.env.local` and add Stripe test credentials plus a Scalable Press test key.
3. Keep `FULFILLMENT_MODE=quote` while developing. Run `npm run dev`.
4. In another terminal, forward Stripe test webhooks:
   `stripe listen --forward-to localhost:3000/api/stripe/webhook`
5. Put the displayed `whsec_...` value in `.env.local`, restart, and use Stripe test card `4242 4242 4242 4242` with any future expiry/CVC and a U.S. shipping address.

## Fulfillment safety

`quote` is the default and safe mode: a successful payment creates Scalable Press artwork and an order-ready quote, but never submits a physical order. `live` additionally exchanges the quote's order token for a real print order. Do not enable `live` until the product, artwork, address mapping, margins, policies, alerts, and webhook replay behavior have been approved using the provider dashboards.

## Deploy

Configure `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SP_AUTH`, `FULFILLMENT_MODE`, and `NEXT_PUBLIC_SITE_URL` in Vercel. Point a Stripe `checkout.session.completed` webhook at `https://your-domain/api/stripe/webhook`. Run `npm run build` before deploying.
