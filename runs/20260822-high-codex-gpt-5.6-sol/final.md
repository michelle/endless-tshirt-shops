## 1. Built and deployed

Public preview: https://benchmark-20260822-high-codex-gpt-56-og51lq12c.vercel.app

Project: `benchmark-20260822-high-codex-gpt-5.6-sol`

Includes:

- Live millisecond timestamp shirt preview
- Fitted/unisex and size customization
- Stripe-hosted test checkout at $22.50
- Server-side validation and pricing
- Scalable Press artwork, design, quote, and test-order fulfillment
- Fulfillment retries/idempotency metadata
- Responsive storefront, confirmation page, and security headers

## 2. Run and verify

See [README.md](/var/folders/wd/gw90z80s6xlc536l4gbc24v00000gn/T/benchmark-workspace.4Bl92V/README.md).

```bash
npm install
npm run dev
```

Verification:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

For deployed checkout, use Stripe test card `4242 4242 4242 4242`, any future expiry/CVC, and a US shipping address.

Verified:

- Public HTTP 200
- Stripe Checkout Session creation
- Stripe session metadata updates
- Invalid option/price tampering rejected
- Scalable Press design, quote, and full test order
- Desktop visual rendering

## 3. Remaining launch steps

- Replace test credentials with live Stripe and Scalable Press keys.
- Register `/api/webhooks/stripe` for `checkout.session.completed` and set `STRIPE_WEBHOOK_SECRET`.
- Verify and select a dedicated fitted/women’s Scalable Press SKU.
- Update dependencies when registry-available advisory fixes land.

## 4. Limitations

- Shipping is US-only.
- Both cuts currently fulfill using the reliable Next Level blank.
- The success page triggers fulfillment because the restricted Stripe sandbox key cannot create webhook endpoints.
- High-volume launch should add a durable order database/queue.
- The available package-registry snapshot leaves audit advisories in framework transitive dependencies.

## 5. Key decisions

- Used hosted Stripe Checkout for PCI scope and reliable address collection.
- Kept price and fulfillment configuration entirely server-side.
- Generate high-resolution timestamp artwork server-side.
- Preserved the original minimal timestamp-shirt concept while giving it a contemporary editorial storefront.

## 6. Friction encountered

- Stripe Projects required browser reauthentication and reported the account ineligible; the authenticated Stripe sandbox key was used directly.
- Historical women’s Scalable Press SKUs repeatedly returned provider-side 500s.
- Vercel initially selected a static preset and enabled SSO protection; both were corrected.
- Local headless browsers were killed by host policy, so deployed visual inspection used an external screenshot renderer.