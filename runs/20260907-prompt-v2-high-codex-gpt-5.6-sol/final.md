Your store is live: [Afterglow Supply Co.](https://benchmark-20260907-prompt-v2-high-c-gold.vercel.app)

It includes three original, late-night-radio-themed shirts, responsive shopping, size selection, cart management, checkout validation, and server-side Prodigi integration.

### How to test

1. Select a size and add a shirt to the bag.
2. Continue to test checkout.
3. Enter a valid-format US test address and email.
4. Place the sandbox order.

I completed this flow successfully. Prodigi accepted test order `ord_1170874`. Sandbox orders aren’t charged, printed, or shipped, per [Prodigi’s API documentation](https://www.prodigi.com/print-api/docs/reference/).

The shirts map to the global Bella + Canvas 3001 blank, SKU `GLOBAL-TEE-BC-3001`. [Product details](https://www.prodigi.com/products/mens-clothing/t-shirts/classic/bella-canvas-3001/)

### Known gaps

- No payment processing, tax calculation, or live shipping quote.
- Checkout is US-only and merchandise totals exclude shipping.
- Fulfillment is sandbox-only.
- No customer accounts, confirmation emails, order history, or webhook-driven tracking.
- A multi-browser/device visual test was not performed.
- The original AI-generated artwork should receive final IP review, print preflight, and physical sample approval.

### Before production

- Add Stripe or another payment provider and create Prodigi orders only after confirmed payment.
- Add shipping quotes, sales-tax handling, refunds, privacy/terms, and customer support details.
- Order physical samples and approve color, placement, and print quality.
- Configure a custom domain and transactional email.
- Switch to a separate live Prodigi key and `api.prodigi.com` only when ready—valid live orders can enter fulfillment immediately.

The built-in image generator created the mockups and print artwork using the “lost broadcasts after midnight” prompt set: Night Signal radio tower, Lunar Static moon interference, and Dead Air Club field recorder. Files are saved in [product mockups](</var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.kgiLbT/public/products>) and [print artwork](</var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.kgiLbT/public/print>).