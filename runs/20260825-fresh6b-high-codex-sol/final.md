## 1. Built and deployed

Production-quality Next.js storefront with:

- Live millisecond timestamp preview
- Unisex/fitted fits and S–XL sizing
- Stripe-hosted test checkout
- Signed, idempotent Stripe webhook
- Prodigi sandbox fulfillment
- Print-ready transparent PNG artwork
- Responsive design, validation, and security headers

Deployed: https://benchmark-20260825-fresh6b-high-cod-tau.vercel.app

Verified Prodigi order: `ord_1168962`, artwork status `Complete`, no issues.

## 2. Run and verify

See [README.md](</var/folders/wd/gw90z80s6xlc536l4gbc24v00000gn/T/benchmark-workspace.9go6Gw/README.md>).

```bash
npm install
npm test
npm run typecheck
npm run dev
```

On the deployed shop, use Stripe test card `4242 4242 4242 4242`, any future expiry/CVC, and a US test address.

Health check: https://benchmark-20260825-fresh6b-high-cod-tau.vercel.app/api/health

## 3. Before real customers

- Claim the temporary Stripe sandbox before September 1, 2026, or replace it with your Stripe account.
- Add live Stripe keys and create a live webhook for `/api/webhooks/stripe`.
- Replace the Prodigi sandbox key and URL with live credentials and `https://api.prodigi.com/v4.0`.
- Order physical samples and confirm garment availability, print placement, shipping times, and margins.
- Configure sales tax, refunds, legal pages, customer support, and webhook monitoring.
- Reassess the $22.50 price against live Prodigi and shipping costs.

## 4. Limitations

- Currently sandbox-only and US shipping only.
- Tax calculation is not enabled.
- Stripe and Prodigi are the systems of record; there is no separate admin database.
- No automated shipping-status emails beyond provider behavior.

## 5. Key decisions

I retained the original’s monochrome timestamp-shirt concept, modernized its editorial presentation, used Stripe Checkout to reduce payment-security scope, and mapped fits to current Prodigi Bella + Canvas 3001/6004 products. Fulfillment uses immutable Stripe metadata and Prodigi idempotency.

## 6. Friction

Stripe sandbox provisioning initially fell back to browser authentication; a run-unique sandbox identity succeeded. Stripe Projects initialization still requires an authenticated browser session, so its project wrapper could not be completed. Headless Chromium was also killed by the host, preventing automated screenshot comparison; functional, asset, responsive-code, and integration checks all passed.