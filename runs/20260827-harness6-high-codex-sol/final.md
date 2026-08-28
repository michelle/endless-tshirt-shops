## 1. Built and deployed

Rebuilt datetime.store as a polished, responsive storefront with:

- Live millisecond timestamp shirt preview
- Fitted/unisex Prodigi products and S–XL sizing
- Stripe-hosted Checkout at $22.50 with free shipping
- Signed Stripe webhooks and idempotent fulfillment
- Prodigi sandbox ordering with 3600×4500 print artwork
- Success/retry flow, health endpoint, SEO, and generated social card

Deployed URL: **https://benchmark-20260827-harness6-high-co-one.vercel.app**

## 2. Run and verify

Use Node 24:

```bash
cp .env.example .env.local
npm install
npm run dev
```

Then purchase with Stripe’s test card `4242 4242 4242 4242`, any future expiry, and any CVC. [Stripe testing guide](https://docs.stripe.com/testing)

The deployed environment was verified to create Stripe Checkout Sessions and process a signed completion event into Prodigi sandbox order `ord_1169330`. Prodigi accepted the correct unisex SKU, size, color, and artwork. Sandbox orders are neither charged nor physically fulfilled. [Prodigi sandbox documentation](https://www.prodigi.com/print-api/docs/reference/)

Additional instructions are in [README.md](/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.IRcXQq/README.md).

## 3. Before accepting real customers

- Claim the temporary Stripe sandbox by **September 4, 2026** with `stripe sandbox claim`, or replace it with your permanent Stripe account.
- Configure live Vercel values for `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `PRODIGI_API_KEY`.
- Set `PRODIGI_API_BASE_URL=https://api.prodigi.com/v4.0`, `NEXT_PUBLIC_SHOP_MODE=live`, and your final `NEXT_PUBLIC_SITE_URL`.
- Register the production Stripe webhook for `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
- Add Stripe Tax or a tax-registration strategy, refund/support policies, privacy terms, and a custom domain.
- Order physical samples for both fits and every size before launch.
- Revisit pricing: current US sandbox quotes are approximately $18.35 fitted and $16.99 unisex including budget shipping, before tax and Stripe fees. The $22.50 price leaves a narrow margin.

## 4. Limitations and assumptions

- The deployed shop is intentionally test/sandbox-only.
- Checkout currently supports 20 common destination countries rather than worldwide shipping.
- Prodigi callbacks are acknowledged but shipment tracking is not persisted or displayed.
- There is no merchant dashboard, customer account, inventory system, or automated email beyond Stripe/Prodigi notifications.

## 5. Key decisions

- Used hosted Stripe Checkout for stronger payment security and lower maintenance.
- Fulfillment happens from verified paid sessions, with both webhook delivery and a safe success-page retry.
- Used Prodigi’s Bella+Canvas 6004 fitted and 3001 unisex global SKUs.
- Kept the original live-timestamp concept while replacing the dated Bootstrap styling with a restrained editorial fashion aesthetic.
- Made sandbox/live Prodigi switching environment-driven, so launch requires configuration rather than code changes.

## 6. Friction encountered

- The available browser-control surface was unavailable, so verification used deployed HTTP endpoints, Stripe APIs, signed webhook events, and Prodigi’s sandbox rather than an automated visual card-entry session.
- Prodigi requires a non-empty second address line; absent values now safely map to `N/A`.
- Vercel still accepts the required explicit `--name` argument but warns that the flag is deprecated.