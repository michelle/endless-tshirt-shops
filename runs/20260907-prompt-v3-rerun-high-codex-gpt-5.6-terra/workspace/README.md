# Star Signal Studio

A one-of-one DTG t-shirt store. Customers compose a celestial field-note from their name, place, zodiac sign and a colorway. Stripe Checkout collects payment and shipping details; only a verified `checkout.session.completed` webhook submits the print-ready PNG and fulfillment record to Prodigi.

## Local setup

1. Copy `.env.example` to `.env.local` and set the credentials.
2. `npm install && npm run dev`
3. For local fulfillment testing, use Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe-webhook`, then put its `whsec_...` value in `.env.local`.
4. Use Stripe's test card `4242 4242 4242 4242`. With `PRODIGI_API_BASE=https://api.sandbox.prodigi.com`, the paid order creates a safe sandbox order only.

## Vercel configuration

Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `APP_URL`, `PRODIGI_API_KEY`, and `PRODIGI_API_BASE` in Vercel. Register `https://YOUR_DOMAIN/api/stripe-webhook` in Stripe and listen for `checkout.session.completed`.

For production, switch Stripe to live mode, set the Prodigi Live endpoint and corresponding live API key, enable Stripe Tax or calculate taxes appropriately, confirm shipping rates and destination availability, and add a durable order/event store plus customer support and legal pages.
