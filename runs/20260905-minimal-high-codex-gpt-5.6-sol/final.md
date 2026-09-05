Deployed successfully:

**[Open datetime.store rebuild](https://benchmark-20260905-minimal-high-cod-pi.vercel.app)**

Vercel project: `benchmark-20260905-minimal-high-codex-gpt-5.6-sol`

### How to test

1. Select a fit and size.
2. Click **Buy this moment**.
3. In Stripe Checkout use:
   - Card: `4242 4242 4242 4242`
   - Any future expiry
   - Any CVC
   - A valid shipping address
4. After payment, the confirmation page should display the frozen timestamp and Prodigi order ID.

The Stripe webhook is enabled, and a Prodigi sandbox smoke order was successfully created as `ord_1170542`. Prodigi’s sandbox does not charge or ship orders.

### Known gaps

- The generated Stripe sandbox expires **September 12, 2026** unless claimed.
- Stripe is in test mode and Prodigi is using its sandbox endpoint.
- Taxes are not yet collected.
- Refunds do not automatically cancel corresponding Prodigi orders.
- The artwork and placement need a physical sample before accepting live orders.
- Shipping is free to the customer, but live international costs and margins need review.
- Order administration currently happens through Stripe and Prodigi rather than a dedicated dashboard.

### What to do next

1. Run `stripe sandbox claim` before September 12.
2. Order a physical sample and verify timestamp size and chest placement.
3. Configure Stripe business details, tax collection, branding, receipts, and live credentials.
4. Obtain a Prodigi live key, then change `PRODIGI_BASE_URL` to `https://api.prodigi.com/v4.0`.
5. Add refund/cancellation coordination and production monitoring.
6. Attach the real `datetime.store` domain and update the Stripe webhook URL.

The generated social preview is saved at [public/og.png](</var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.uji5Fv/public/og.png>). It was created with the built-in image generator using a minimal editorial black timestamp-shirt composition, warm off-white background, cobalt accent, and the exact text “datetime.store” / “a moment you can wear.”