Built and deployed a polished datetime.store rebuild.

1. Deployed URL

https://benchmark-20260815t231849z-codex-gp.vercel.app

Fresh Vercel project:

`benchmark-20260815t231849z-codex-gpt-5.6-luna`

2. How to run and verify

```bash
npm install
STRIPE_SECRET_KEY=... SP_AUTH=... npm run dev
```

Verify:

- Live millisecond timestamp updates on the shirt.
- Select fitted/unisex style and size.
- Click “Continue to checkout”.
- Use Stripe test card `4242 4242 4242 4242`.
- Scalable Press receives a generated PNG design after payment.

The deployed checkout endpoint was verified to create real Stripe test Checkout Sessions. Scalable Press’s test API also accepted the generated PNG design payload.

3. Remaining launch steps

- Replace the Stripe test key with a production secret key.
- Replace `SP_AUTH` with the production Scalable Press credential.
- Configure a Stripe webhook for reliable fulfillment.
- Add durable order storage and fulfillment retry handling.
- Confirm production shipping countries and product SKUs.

4. Known limitations

- Fulfillment currently begins from the success page rather than a webhook.
- Durable order persistence is not yet included.
- The fulfillment artwork is rasterized server-side with a simple timestamp layout.
- No real payment was captured during verification; the complete Stripe test session creation flow was confirmed.

5. Key decisions

- Used Stripe Checkout so card data never reaches the application.
- Preserved the original product idea: a black shirt with a live timestamp, style choices, size choices, and discounted $22.50 pricing.
- Used Scalable Press DTG products from the reference implementation.
- Added server-side PNG rasterization because Scalable Press rejects SVG artwork.
- Added fulfillment idempotency using Stripe Session metadata.
- Disabled Vercel SSO protection on this run-specific sandbox so it is publicly reachable.

6. Friction encountered

- Vercel required a lowercase project name, so the supplied run name was normalized to lowercase.
- Vercel CLI was only available under Node 20.
- Deployment protection initially blocked anonymous access.
- Scalable Press’s API surfaced the PNG-only artwork requirement, which was corrected before the final deployment.