# datetime.store

A polished rebuild of the original datetime shirt store. It creates a Stripe-hosted checkout session for the selected black made-to-order shirt, then verifies paid sessions before handing fulfillment to Scalable Press. The fulfillment route renders the captured timestamp to a print-ready PNG, creates a Scalable Press design, quotes the selected garment, and submits the order.

## Local setup

```bash
npm install
STRIPE_SECRET_KEY=sk_test_... SP_AUTH=... npm run dev
```

Open `http://localhost:3000`; use Stripe’s test card `4242 4242 4242 4242`, any future expiry/CVC, and a valid US address. The success callback has provider-backed idempotency metadata; for a high-volume launch, also wire the same handler to a signed Stripe webhook and use a durable order store to cover concurrent delivery attempts.
