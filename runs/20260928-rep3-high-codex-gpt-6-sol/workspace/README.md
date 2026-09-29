# Sonder Studio — Moment Map Tee

A Next.js storefront for personalized, direct-to-garment Bella + Canvas 3001 shirts. Customers choose a place, date, message, color, and size. The site creates a transparent PNG print file from those details. Stripe Checkout collects payment and a US shipping address. A verified `checkout.session.completed` webhook (or `checkout.session.async_payment_succeeded`) submits the order to Prodigi only after Stripe reports `payment_status: paid`.

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in a Stripe test secret key, webhook secret, Prodigi sandbox API key, a random 32-byte artwork signing secret, and `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
3. `npm run dev`
4. For local webhook testing, run `stripe listen --forward-to localhost:3000/api/webhook` and use the printed `whsec_...` as `STRIPE_WEBHOOK_SECRET`.

## Stripe setup for the deployment

Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to the Vercel project's **Production** environment. In the Stripe test dashboard, create a webhook endpoint at `https://benchmark-20260928-rep3-high-codex.vercel.app/api/webhook` and subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Redeploy after adding the variables. Use Stripe's test card `4242 4242 4242 4242`, any future expiry, and any CVC to test checkout. Verify the Stripe event delivers successfully and the matching order appears in the Prodigi sandbox dashboard.

## Operational notes

- Catalog SKU: `GLOBAL-TEE-BC-3001`, front print area, sizes S–2XL, black/navy. These variants were confirmed through Prodigi's sandbox product API for US delivery.
- Price: $39.00 plus $5.00 standard US shipping. The sampled Prodigi sandbox quote was $16.53 before any applicable tax. Recheck margin, taxes, and shipping rates before selling live.
- The print asset URL is signed with `ART_SIGNING_SECRET` and serves a full-size PNG only for a paid Stripe session. Public preview requests render a smaller PNG.
- Prodigi orders use the Stripe Checkout Session ID as the idempotency key, so retried Stripe webhooks do not create duplicate shirts.
- Prodigi stays on sandbox until a live API key and `PRODIGI_API_BASE=https://api.prodigi.com` are configured. The sandbox does not print or ship.
- The app currently supports US orders only. Before live sales, configure taxes, customer support and return policy, test a physical sample, and monitor Stripe webhook delivery and Prodigi order issues.
