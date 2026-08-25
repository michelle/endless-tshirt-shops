Built and deployed a polished Next.js rebuild of datetime.store:

https://benchmark-20260825-fresh6b-high-cod.vercel.app

It includes the live timestamp tee preview, fit/size selection, Stripe-hosted Checkout, receipt emails, high-resolution timestamp artwork, and an idempotent Prodigi fulfillment pipeline.

Verification completed:

- Production build passed.
- Deployed homepage and 2100×2400 PNG print artwork return successfully.
- Stripe test Checkout Session creation succeeds.
- Prodigi sandbox accepted a validation-only order using the generated hosted artwork.

Run locally with:

```bash
cp .env.example .env.local
npm install
npm run dev
```

Use Stripe test card `4242 4242 4242 4242`, any future expiry/CVC.

Before accepting real customers, a human needs to:

1. Claim/replace the temporary Stripe sandbox key (it expires September 1, 2026), then add live Stripe keys for launch.
2. In Prodigi, select the exact black shirt SKU(s) available to the merchant account and set `PRODIGI_TSHIRT_SKU`, `PRODIGI_TSHIRT_PRINT_AREA`, and, if needed, `PRODIGI_TSHIRT_ATTRIBUTES`.
3. Register `/api/stripe-webhook` for `checkout.session.completed` and set `STRIPE_WEBHOOK_SECRET`.
4. Switch Prodigi from sandbox to live API/key, validate actual garment pricing/shipping, and adjust the $22.50 retail price accordingly.
5. Decide whether fitted and unisex require separate Prodigi SKUs; the current flow supports one configured garment SKU.

Known limitation: Prodigi’s sandbox catalog rejected the commonly cited shirt SKU, so I made the garment configuration explicitly required rather than risk sending paid orders to an invalid SKU. The integration and artwork delivery are validated, but live apparel fulfillment needs the merchant’s account-specific SKU/options. I also couldn’t run a browser-driven card submission because Chromium was terminated by the execution environment; Stripe Checkout creation was verified directly.

Key decisions: modern hosted Stripe Checkout for PCI safety, webhook plus success-page fulfillment fallback for reliability, and session-ID idempotency to prevent duplicate print orders. Stripe Projects initialization was attempted but required an interactive browser login, so I used the provided Stripe sandbox CLI flow instead.