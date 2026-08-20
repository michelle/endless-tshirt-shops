# datetime.store

A modern rebuild of the original one-product store: choose a black shirt cut and size, then buy the exact Unix-millisecond timestamp displayed on it.

## Local run

```bash
npm install
STRIPE_SECRET_KEY=sk_test_... SP_AUTH=... npm run dev
```

Open `http://localhost:3000`. Use Stripe test card `4242 4242 4242 4242` with any future expiry, CVC, and US ZIP.

## Fulfillment architecture

`/api/checkout` creates a Stripe Checkout Session with the cut, size, and timestamp in session metadata. The success page calls `/api/fulfill`, which verifies that the session is paid, rasterizes the timestamp to a PNG, creates a Scalable Press DTG design and quote, submits the order, then records the returned Scalable Press order ID in Stripe session metadata. A repeat success-page visit is idempotently acknowledged after submission.

Set `STRIPE_SECRET_KEY` and `SP_AUTH` as server-side environment variables. The current deployment uses Stripe test credentials and the supplied Scalable Press test key.
