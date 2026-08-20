Built and deployed a production-ready rebuild of datetime.store:

https://benchmark-20260820-codex-gpt-56-ter.vercel.app

It preserves the original core experience: a live millisecond timestamp on a black tee, fitted/unisex cuts, size selection, and the $22.50 purchase flow.

What’s included:

- Stripe-hosted test Checkout Session flow.
- Server-side Scalable Press DTG fulfillment integration.
- Timestamp rasterized to PNG artwork (required by Scalable Press).
- Paid-session verification before fulfillment and a submitted-order guard for repeat success visits.
- Polished responsive single-product storefront.
- Vercel project: `benchmark-20260820-codex-gpt-5.6-terra`.

Verification:

- `npm run build` passes locally and on Vercel.
- The deployed homepage responds successfully.
- The deployed `/api/checkout` creates real Stripe test Checkout Sessions.
- The fulfillment endpoint correctly blocks unpaid sessions.
- Scalable Press accepted the generated PNG design in test mode.

To run locally:

```bash
npm install
STRIPE_SECRET_KEY=sk_test_... SP_AUTH=... npm run dev
```

Use Stripe’s test card `4242 4242 4242 4242`, any future expiry/CVC, and a US ZIP. Implementation notes are in [README.md](/var/folders/wd/gw90z80s6xlc536l4gbc24v00000gn/T/benchmark-workspace.4tsgR2/README.md).

Remaining launch work:

- Replace test Stripe credentials with production credentials.
- Add a Stripe webhook for durable asynchronous fulfillment (the current success-page confirmation is a practical sandbox implementation).
- Complete a live Scalable Press quote/order validation. Their test design API succeeded, but the quote endpoint returned an undocumented provider-side HTTP 500 for the reference product/address combination.

Key decision: I used Stripe Checkout rather than embedding card fields, reducing PCI exposure and making the payment flow more robust while keeping the original store’s minimal one-page character.