# datetime.store

A production-oriented rebuild of the original datetime.store: every made-to-order black tee is printed with the exact Unix timestamp captured when its buyer starts checkout.

## Stack

- Next.js App Router + TypeScript
- Stripe hosted Checkout (test or live mode)
- Signed Stripe webhook fulfillment, with a success-page fallback
- Scalable Press API v2 design, quote, and order flow
- Vercel deployment

## Local setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and fill in sandbox credentials.
3. Leave `SP_PLACE_ORDERS=false` to test through the quote stage, or set it to `true` only with a Scalable Press test key.
4. Run `npm run dev`, then open `http://localhost:3000`.

Use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC, and a valid US shipping address. The health endpoint at `/api/health` confirms server-side integration configuration without exposing secrets.

## Verification

```bash
npm test
npm run typecheck
npm run build
curl http://localhost:3000/api/health
```

For reliable production fulfillment, register `https://YOUR_DOMAIN/api/webhooks/stripe` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`, then set the resulting signing secret as `STRIPE_WEBHOOK_SECRET`. The return page also attempts fulfillment, but the webhook covers customers who close their browser before returning.

## Fulfillment safety

Scalable Press is called only after the Checkout Session is verified as paid directly with Stripe. The PaymentIntent metadata records processing, failure, and final Scalable Press references so retries are visible and completed orders are not normally submitted twice. A durable job queue/database is recommended before higher-volume launch for strict concurrency guarantees and operational replay.
