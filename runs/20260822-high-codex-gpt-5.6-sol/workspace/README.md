# datetime.store

A modern rebuild of the original datetime.store: choose a tee, lock the current Unix timestamp to the millisecond, pay through Stripe Checkout, and send print-ready artwork to Scalable Press.

## Local development

1. Copy `.env.example` to `.env.local` and add Stripe test and Scalable Press test credentials.
2. Run `npm install` and `npm run dev`.
3. Open `http://localhost:3000`, choose a cut and size, and use Stripe's test card `4242 4242 4242 4242` with any future expiry and CVC.

`SCALABLE_PRESS_ORDERING=quote-only` validates designs and quotes without submitting even a test order. Set it to `enabled` only with a Scalable Press test key.

## Verification

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Production fulfillment should receive Stripe `checkout.session.completed` and `checkout.session.async_payment_succeeded` events at `/api/webhooks/stripe`. The success page also performs authenticated payment-status verification and fulfillment as a recovery path.

## Product mapping

Both on-screen cuts currently use Scalable Press's reliable `next-level-fitted-crew` DTG blank. The original fitted/women's product IDs currently return provider-side 500 responses during quoting in the Scalable Press test environment. Switch the `fitted` entry in `src/lib/config.ts` after verifying a replacement SKU.
