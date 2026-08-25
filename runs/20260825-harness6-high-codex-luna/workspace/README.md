# datetime.store

A production-minded rebuild of `datetime.store`: a single-product shop selling a black tee printed with the millisecond captured when the customer starts checkout.

## Local setup

```bash
npm install
vercel env pull .env.local   # or create .env.local from the variables below
npm run dev
```

Required environment variables:

```text
STRIPE_SECRET_KEY=sk_test_...
PRODIGI_API_KEY=...
PRODIGI_API_URL=https://api.sandbox.prodigi.com
ARTWORK_SIGNING_SECRET=any-long-random-string
```

The app uses Stripe-hosted Checkout. Use Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC, and a real-looking test shipping address. A successful Checkout return calls `/api/complete-order` and creates an idempotent Prodigi sandbox order. The `/api/stripe-webhook` endpoint is also ready for `checkout.session.completed` and async payment success events.

For local webhook testing, run `stripe listen --forward-to http://localhost:3000/api/stripe-webhook` and add the printed `whsec_...` as `STRIPE_WEBHOOK_SECRET`.

## Production launch checklist

1. Replace the Stripe sandbox secret with a live secret and set a live Stripe webhook signing secret.
2. Replace the Prodigi sandbox key and URL with the live API credentials.
3. Confirm the chosen `GLOBAL-TEE-GIL-5000` SKU, black color, print area, sizing, margins, and shipping rates in Prodigi; order a physical sample.
4. Set `PUBLIC_APP_URL` to the canonical HTTPS domain and configure the Stripe webhook URL to `https://your-domain/api/stripe-webhook`.
5. Add a real customer support email, privacy/terms/refund pages, and a durable order store/observability system before significant volume.

## API shape

- `POST /api/create-checkout-session` creates a server-side Stripe Checkout Session.
- `GET /api/complete-order?session_id=...` retrieves a paid session and fulfills it in Prodigi.
- `POST /api/stripe-webhook` handles Stripe's authoritative fulfillment event.
- `GET /api/artwork?...` renders a signed PNG timestamp asset for Prodigi to download.
