Built and deployed a production-quality datetime.store rebuild.

1. Deployed app

[Open the live preview](https://benchmark-20260825-fresh6b-high-codex-luna-le53x1f9w.vercel.app)

Vercel project: `benchmark-20260825-fresh6b-high-codex-luna`

2. Run and verify

```bash
npm install
cp .env.example .env.local
npm run dev
```

Use Stripe test card `4242 4242 4242 4242`, any future expiry, and any CVC.

Verified end to end:

- Stripe test PaymentIntent succeeded.
- Prodigi sandbox order created successfully.
- Final deployed sandbox order: `ord_1168966`
- Artwork endpoint returns a print-ready 2490×3510 PNG.

3. Before real customers

- Add live Stripe keys to Vercel.
- Set `PRODIGI_ENV=live` and add a live Prodigi API key.
- Configure `STRIPE_WEBHOOK_SECRET`.
- Register `/api/stripe-webhook` in Stripe.
- Set `PUBLIC_URL` to the canonical HTTPS domain.
- Review international shipping, taxes, refunds, and return policies.
- Confirm the Bella+Canvas SKU and pricing with Prodigi before launch.

4. Known limitations

- Checkout currently supports US shipping only.
- Orders are submitted immediately after successful payment; the webhook fallback requires configuration.
- No persistent order database or admin dashboard is included.
- Stripe webhook recovery is implemented but disabled until its signing secret is added.

5. Key decisions

- Rebuilt with Next.js serverless routes for simple Vercel deployment.
- Used Stripe Payment Element instead of legacy tokenized card fields.
- Used Prodigi SKU `GLOBAL-TEE-BC-3001`.
- Captured the exact purchase millisecond and rendered it server-side as a PNG that Prodigi can fetch.
- Added Prodigi idempotency keys based on Stripe PaymentIntent IDs.
- Preserved the original black tee, live timestamp, fitted/unisex, S–XL, $22.50, and free-shipping experience while modernizing the layout.

6. Friction encountered

- Vercel initially detected the project as a generic “Other” app; corrected it to Next.js.
- Vercel’s default deployment protection blocked anonymous preview access; disabled it for this new project.
- An initial remote dependency fetch failed transiently and succeeded on retry.
- Stripe required redirect-based payment methods to be disabled for the embedded test checkout flow.