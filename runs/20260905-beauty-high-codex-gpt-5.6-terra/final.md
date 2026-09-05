Deployed: [datetime.store](https://benchmark-20260905-beauty-high-code-woad.vercel.app)

It’s a polished timestamp-tee storefront with live capture, Stripe Checkout, signed print-ready artwork, and a Prodigi v4 webhook fulfillment flow. Production build and deployed checkout-session creation were verified.

To test:

1. Visit the deployed site, select color/size, and click “Make it mine.”
2. In Stripe Checkout, use `4242 4242 4242 4242`, any future expiry, any CVC, and any valid postal code.
3. After successful payment, Stripe sends the verified webhook; it creates an idempotent order in the configured Prodigi sandbox. Sandbox orders do not print or ship.

Important next steps:

- Claim the temporary Stripe sandbox before it expires on September 12, 2026, then replace its credentials with your owned Stripe test/live account credentials.
- Prodigi is intentionally set to sandbox. Replace `PRODIGI_BASE_URL` with `https://api.prodigi.com/v4.0` and use a live Prodigi key only after validating live pricing and fulfillment.
- Add sales-tax configuration and dynamic shipping/margin logic before real sales. Prodigi’s US quote returned a sales-tax warning.
- Add a durable order database and customer-facing tracking; callbacks are currently acknowledged and logged but not persisted.

Implementation notes and environment requirements are in [README.md](/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.Zi3RNa/README.md).