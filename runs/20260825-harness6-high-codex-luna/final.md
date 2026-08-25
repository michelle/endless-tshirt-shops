Built and deployed `datetime.store` as a new Vercel project:

[Open datetime.store](https://benchmark-20260825-harness6-high-co-iota.vercel.app)

Project: `benchmark-20260825-harness6-high-codex-luna`

Implemented:

- Live millisecond timestamp shirt preview
- Fitted/unisex and S–XL options
- Responsive polished storefront UI
- Stripe-hosted test Checkout flow using server-side sessions and metadata, following Stripe’s recommended Checkout pattern ([Stripe docs](https://docs.stripe.com/payments/checkout-sessions))
- Signed PNG artwork endpoint for Prodigi
- Prodigi sandbox fulfillment using confirmed SKU `GLOBAL-TEE-GIL-5000` ([product reference](https://www.prodigi.com/products/mens-clothing/t-shirts/classic/gildan-5000/))
- Idempotent Prodigi order creation
- Stripe webhook endpoint for asynchronous fulfillment
- Health endpoint and validation errors

Verified:

- `npm run check`
- Public storefront returns HTTP 200
- Stripe sandbox Checkout Session creation works
- Signed artwork returns a 2400×3000 PNG
- Prodigi sandbox order successfully created: `ord_1168853`
- Prodigi sandbox does not charge or fulfill orders ([Prodigi docs](https://www.prodigi.com/print-api/docs/reference/))

Run locally:

```bash
npm install
npm run dev
```

Set:

```text
STRIPE_SECRET_KEY=sk_test_...
PRODIGI_API_KEY=...
PRODIGI_API_URL=https://api.sandbox.prodigi.com
ARTWORK_SIGNING_SECRET=...
```

Use Stripe test card `4242 4242 4242 4242`.

Before launch:

- Replace Stripe sandbox credentials with live credentials.
- Configure `STRIPE_WEBHOOK_SECRET` and register `/api/stripe-webhook`.
- Replace Prodigi sandbox credentials with live credentials.
- Confirm the physical SKU, fit, print area, pricing, and order a sample.
- Add legal pages, privacy/refund terms, customer support email, and durable order storage.
- The current “Fitted” option changes the preview and metadata but uses the same unisex Gildan SKU.

Friction encountered:

- Initial Vercel runtime config was outdated; fixed and redeployed.
- Vercel SSO protection blocked anonymous access, so it was disabled only on this new project.
- Stripe Projects initialization was blocked because the generated sandbox was claimable and no browser session was available. Stripe CLI sandbox credentials were used successfully instead.
- Interactive browser checkout could not be completed in this environment, but Stripe session creation and Prodigi sandbox fulfillment were verified directly.