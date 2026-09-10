# Orbital Post

Orbital Post is a personalized DTG t-shirt storefront. Customers create a one-of-one orbital postcard from a place, name, message, accent, size, and shirt colour. Stripe Checkout collects payment and its signed webhook generates a print-ready PNG URL and submits the order to Prodigi v4.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

For a complete payment test, add Stripe test keys to `.env.local` and forward the webhook with `stripe listen --forward-to localhost:3000/api/webhook`. Use Stripe’s test card `4242 4242 4242 4242`. The provided Prodigi key targets the sandbox and does not manufacture or charge.

## Production checklist

Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRODIGI_API_KEY`, `PRODIGI_BASE_URL=https://api.prodigi.com/v4.0`, and a long random `ART_TOKEN_SECRET` in Vercel. Register `https://YOUR_DOMAIN/api/webhook` in Stripe for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Before going live, add durable order storage/idempotency records, tax handling, privacy/terms/returns pages, email notifications, monitoring, and a fulfillment retry queue.
