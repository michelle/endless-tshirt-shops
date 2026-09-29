# Somewhere, Always

A direct-to-garment storefront for personalized “Memory Constellation” tees. Shoppers create an original coordinate-and-date design and preview it before checkout. Stripe Checkout collects payment and a US shipping address. A signed Stripe webhook submits the order to Prodigi's sandbox only after Stripe marks the session paid. Prodigi receives a PNG print asset rendered at the product's 4680 × 5790 pixel front print resolution.

## Local development

1. `npm install`
2. `cp .env.example .env.local` and fill in Stripe test credentials and the Prodigi sandbox key.
3. `npx vercel dev`
4. Configure Stripe CLI forwarding to `http://localhost:3000/api/stripe-webhook` and set the printed webhook signing secret in `.env.local`.

## Configure the deployed checkout

Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `PRODIGI_API_KEY` as Production environment variables in the Vercel project. The included Prodigi sandbox key should be stored as `PRODIGI_API_KEY`; the default API base is `https://api.sandbox.prodigi.com/v4.0`, which will not print or ship anything. Set `PRODIGI_API_BASE_URL` to `https://api.prodigi.com/v4.0` only when switching to a live Prodigi key.

Create a Stripe webhook endpoint at `https://YOUR_DOMAIN/api/stripe-webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Set the endpoint's signing secret as `STRIPE_WEBHOOK_SECRET`. Use Stripe test mode credentials first. A paid test Checkout session should produce one Prodigi sandbox order; duplicate webhook deliveries are protected with Prodigi's idempotency key.

## Production checklist

Before accepting real orders, replace `PRODIGI_API_KEY` with the live key and set `PRODIGI_API_BASE_URL=https://api.prodigi.com/v4.0`; set Stripe live-mode secret and webhook keys; verify product size/color availability and print asset output; configure shipping rates and delivery estimates against current costs; and publish store policies and customer support details. Current checkout supports US shipping only and charges $34 plus $5.95 standard shipping.
