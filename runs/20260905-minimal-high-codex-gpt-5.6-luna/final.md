Built and deployed: [datetime.store](https://benchmark-20260905-minimal-high-cod-nu.vercel.app)

Implemented:

- Live millisecond timestamp preview
- Fitted/classic cut and size selection
- Stripe Checkout test payments
- Signed Stripe webhook fulfillment
- Prodigi sandbox orders using `GLOBAL-TEE-BC-3001`
- PNG artwork rendering endpoint
- Responsive storefront matching the reference’s intent

Test it:

1. Open the deployed URL.
2. Click “Capture this moment”.
3. Choose a size and continue to Stripe.
4. Use Stripe test card `4242 4242 4242 4242`.
5. Complete checkout; Stripe webhook fulfillment will create a Prodigi sandbox order.

Verified: production build, deployed homepage, artwork PNG generation, Stripe Checkout Session creation, invalid webhook rejection, and Prodigi sandbox order creation.

Known gaps / next steps:

- Prodigi is still sandbox-only; switch `PRODIGI_BASE_URL` to `https://api.prodigi.com` and use a live key before real fulfillment.
- The temporary Stripe sandbox expires September 12, 2026; claim it or replace it with a permanent Stripe account.
- Order history/status persistence is not yet included. See [README.md](/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.umqmTy/README.md).

The Stripe shipping/webhook flow follows Stripe’s Checkout model, and Prodigi uses its v4 order API with public artwork URLs. [Stripe address collection](https://docs.stripe.com/payments/collect-addresses?payment-ui=embedded), [Prodigi order API](https://www.prodigi.com/print-api/docs/reference/).