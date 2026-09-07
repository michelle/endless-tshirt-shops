Deployed successfully:

[datetime.store](https://benchmark-20260906-minimal-inspecto-orpin.vercel.app)

Vercel project: `benchmark-20260906-minimal-inspector-high-codex-gpt-5.6-luna`

Implemented:

- Live millisecond datetime shirt preview
- Fitted/unisex and S–XL selections
- Stripe test-mode PaymentIntent checkout
- Stripe success webhook with idempotent fulfillment
- Prodigi Sandbox fulfillment:
  - Fitted: `GLOBAL-TEE-BC-6004`
  - Unisex: `GLOBAL-TEE-BC-3001`
- Public high-resolution artwork endpoint for Prodigi
- Responsive storefront and success page
- README with local setup instructions

Test it with:

1. Open the deployed URL.
2. Choose a fit and size.
3. Enter test shipping details.
4. Use Stripe card `4242 4242 4242 4242`, any future expiry, any CVC.
5. Confirm the success page shows a Prodigi order ID.

Verified end-to-end with Prodigi Sandbox order `ord_1170769`; Prodigi accepted the fitted SKU and artwork URL. Prodigi requires public artwork URLs, and Sandbox orders are not manufactured or charged. [Prodigi API docs](https://www.prodigi.com/print-api/docs/reference/)

Known gaps:

- Stripe sandbox credentials expire on 2026-09-14 unless claimed.
- Current storefront is US-only with hard-coded free shipping and no tax calculation.
- No admin dashboard or persistent local order database.
- Before launch, replace Stripe sandbox and Prodigi sandbox credentials with live credentials and register a live Stripe webhook.

Source setup is documented in [README.md](/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.SEOadk/README.md).
