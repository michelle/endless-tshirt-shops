Built and deployed datetime.store:

- Live shop: [benchmark-20260825-harness6-high-co.vercel.app](https://benchmark-20260825-harness6-high-co.vercel.app)
- New Vercel project: `benchmark-20260825-harness6-high-codex-terra`

It includes the live timestamp t-shirt preview, fitted/unisex and size selection, $22.50 Stripe Checkout, success/cancel pages, and a Prodigi fulfillment integration using the matching black Bella+Canvas products.

Verification completed:

- Production build passed.
- The live app returns real Stripe sandbox Checkout sessions with US shipping and free shipping configured.
- Prodigi sandbox accepted two test fulfillment orders (`ord_1168849`, `ord_1168850`) using artwork served by the deployed app.

Run locally:

```sh
npm install
cp .env.example .env.local
npm run dev
```

Add Stripe and Prodigi keys to `.env.local`. Use Stripe’s `4242 4242 4242 4242` test card in Checkout.

Before accepting real customers:

1. Replace the sandbox Stripe key with a live secret key.
2. Add live Prodigi credentials and set `PRODIGI_LIVE=true`.
3. Create a Stripe `checkout.session.completed` webhook targeting `/api/stripe-webhook`, then set `STRIPE_WEBHOOK_SECRET` in Vercel.
4. Confirm current Prodigi wholesale pricing/shipping still supports the $22.50 retail price.
5. Claim or discard the temporary Stripe sandbox; it expires on 2026-09-01.

Key decisions: hosted Stripe Checkout reduces payment-surface risk; fulfillment uses Stripe session IDs as Prodigi idempotency keys to prevent duplicate shirts; Prodigi sandbox remains enabled in the deployed environment so no physical orders can be created.

Known limitations: checkout is intentionally US-only; there’s no order-management database/dashboard yet; I could validate Stripe session creation and Prodigi order submission but could not automate entering the test card because no interactive browser surface was available.