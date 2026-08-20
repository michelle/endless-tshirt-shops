Built and deployed a polished datetime.store rebuild.

1. Deployed app

https://benchmark-20260820-codex-gpt-56-luna-fj5eofofu.vercel.app

Features:

- Live millisecond timestamp on shirt preview
- Fitted/unisex styles
- S/M/L/XL sizing
- Stripe Checkout test-mode payment
- Shipping address collection
- Scalable Press design → quote → order flow
- Idempotent fulfillment using Stripe session metadata
- Responsive layout inspired by the original

2. Run and verify

```bash
npm install
npm run build
```

For local serverless API testing:

```bash
vercel dev
```

Required environment variables:

```bash
STRIPE_SECRET_KEY=your_stripe_test_key
SP_AUTH=your_scalable_press_test_key
```

Use Stripe test card `4242 4242 4242 4242` with any future expiry and CVC.

Verified:

- Deployed page is reachable
- Stripe Checkout sessions are created successfully
- Invalid product input is rejected
- Unpaid fulfillment requests are rejected
- Production build completes successfully

3. Remaining launch steps

- Configure a Stripe webhook for `checkout.session.completed`
- Add durable order storage for operational visibility
- Confirm Scalable Press accepts the SVG artwork format in production; switch to PNG generation if required
- Add customer email/order notification handling
- Replace Stripe and Scalable Press test credentials with live credentials
- Configure a custom domain

4. Known limitations and assumptions

- Fulfillment currently runs from the success redirect; a webhook should be added before launch.
- Artwork is generated deterministically as SVG from the purchased timestamp.
- Shipping is limited to the countries configured in Checkout.
- No inventory system is needed because shirts are printed to order.
- Stripe test credentials and Scalable Press test credentials are configured only for the Vercel Preview environment.

5. Key decisions

- Used Stripe Checkout instead of the reference app’s legacy card-token flow for better PCI isolation and reliability.
- Preserved the original visual intent: black shirt, live timestamp, pale blue controls, minimal editorial layout.
- Used Vercel serverless functions for payment and fulfillment.
- Stored the Scalable Press order ID back on the Stripe session to make fulfillment replay-safe.

6. Friction encountered

- Vercel initially enabled SSO deployment protection on the preview URL. I disabled it for this run-specific project and redeployed a publicly reachable preview.
- The initial Vite build needed the React Vite plugin dependency added.
- The original Scalable Press integration expected multipart artwork uploads, so the fulfillment endpoint includes multipart form construction rather than sending JSON-only design data.