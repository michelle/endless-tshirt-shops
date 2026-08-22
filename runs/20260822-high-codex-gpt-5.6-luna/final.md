Built and deployed a polished datetime.store rebuild.

1. Built and deployed

- URL: https://benchmark-20260822-high-codex-gpt-56-luna-49kbprjoh.vercel.app
- New Vercel project: `benchmark-20260822-high-codex-gpt-5.6-luna`
- Live timestamp shirt preview with fitted/unisex styles and S–XL sizing.
- Stripe Checkout session creation and post-payment fulfillment flow.
- Scalable Press design upload, quoting, and order placement.
- Webhook endpoint for asynchronous fulfillment.
- Responsive, accessible storefront design.

Key files:

- [index.html](/var/folders/wd/gw90z80s6xlc536l4gbc24v00000gn/T/benchmark-workspace.XhOsJu/index.html)
- [styles.css](/var/folders/wd/gw90z80s6xlc536l4gbc24v00000gn/T/benchmark-workspace.XhOsJu/styles.css)
- [api/create-checkout-session.js](/var/folders/wd/gw90z80s6xlc536l4gbc24v00000gn/T/benchmark-workspace.XhOsJu/api/create-checkout-session.js)
- [api/_lib.js](/var/folders/wd/gw90z80s6xlc536l4gbc24v00000gn/T/benchmark-workspace.XhOsJu/api/_lib.js)

2. Run and verify

```sh
npm install
npm start
```

For Vercel Functions locally:

```sh
vercel dev
```

Stripe test checkout card:

```text
4242 4242 4242 4242
Any future expiry
Any 3-digit CVC
```

Verified deployed:

- Homepage returns 200.
- CSS and JS assets return 200.
- `/api/config` returns the configured test publishable key.
- Checkout validation errors are handled correctly.
- Scalable Press test `/v2/design` integration returned a successful test design response.

3. Remaining launch steps

Add these Vercel environment variables:

```text
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

`SP_AUTH` and `STRIPE_PUBLISHABLE_KEY` are already configured.

Then configure Stripe webhook delivery to:

```text
https://benchmark-20260822-high-codex-gpt-56-luna-49kbprjoh.vercel.app/api/webhook
```

4. Limitations and assumptions

- Stripe secret-key provisioning was blocked by expired browser authentication in the Stripe CLI.
- The deployed checkout UI is wired, but a real Stripe Checkout Session cannot be created until a current server-side Stripe secret key is added.
- Fulfillment state currently uses Stripe Session metadata and an in-memory lock; production volume should use a durable database or queue.
- Abandoned checkouts may leave unused Scalable Press designs.
- Product IDs match the original reference implementation.

5. Decisions

- Used Stripe-hosted Checkout to avoid handling raw card data.
- Generate timestamp artwork in the browser, then upload it server-side to Scalable Press.
- Delay Scalable Press quoting/order placement until Stripe confirms payment.
- Preserved the reference’s black tee, live timestamp, simple purchase flow, and discounted $22.50 price.
- Used static frontend assets and Vercel Functions for low operational overhead.

6. Friction

- Vercel initially detected the browser `app.js` as a Node entrypoint; renamed it and added an explicit static build output.
- Vercel preview protection initially blocked public access; disabled SSO deployment protection.
- Stripe Projects and sandbox creation required browser re-authentication that could not complete autonomously.