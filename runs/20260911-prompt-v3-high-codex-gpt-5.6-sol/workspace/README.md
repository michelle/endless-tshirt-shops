# Orbitline

Orbitline is a one-product custom t-shirt store. A customer enters two names, a meaningful place, and a date; the store turns those details into a deterministic one-of-one orbital design and shows it on the shirt in real time.

## Order flow

1. The server validates the customization and creates a server-priced Stripe Checkout Session for $44.
2. Stripe collects payment, email, phone, billing details, and a US shipping address.
3. `/api/webhook` verifies Stripe's signature and ignores unpaid sessions.
4. After `payment_status` becomes `paid`, the webhook creates a Prodigi order using the Checkout Session ID as Prodigi's idempotency key.
5. Prodigi downloads a signed, customer-specific vector PDF from `/api/artwork` and prints it on the front of a navy Bella + Canvas 3001 tee.

The browser cannot call Prodigi and cannot choose the price. Replayed Stripe events resolve to the same Prodigi order.

## Required environment variables

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PRODIGI_API_KEY`
- `PRODIGI_API_BASE` (`https://api.sandbox.prodigi.com/v4.0` for testing)
- `SITE_URL` (optional on Vercel; recommended for a production custom domain)

## Stripe setup

Create a test-mode webhook destination for `https://YOUR-DOMAIN/api/webhook` and subscribe to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`

Add the destination's `whsec_...` signing secret and a test-mode `sk_test_...` secret to Vercel. Use Stripe test card `4242 4242 4242 4242`, any future expiry, and any CVC.

## Commands

```bash
npm run dev
npm run build
```

`GET /api/health` reports whether Stripe and Prodigi are configured without exposing credentials.
