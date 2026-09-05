## 1. Built and deployed

Production-quality datetime.store rebuild with:

- Live millisecond timestamp preview
- Fitted/unisex cuts and S–XL sizing
- Stripe Checkout session creation
- Stripe signed webhook handling
- Dynamic print-ready 4677×5787 PNG artwork
- Prodigi v4 sandbox fulfillment with idempotency protection
- Responsive, editorial storefront design inspired by the [original reference](https://github.com/michelle/datetime.store)

Deployed URL: [https://benchmark-20260904-harness7-high-co-sigma.vercel.app](https://benchmark-20260904-harness7-high-co-sigma.vercel.app)

## 2. Run and verify

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then:

1. Choose a cut and size.
2. Click “buy the moment”.
3. Complete Stripe Checkout with a test card.
4. Confirm the success state and Prodigi sandbox order.

Validation completed:

- `npm run build`
- `npm run lint`
- Public deployment HTTP 200
- Stripe Checkout session created with metadata
- Prodigi sandbox order created successfully, no issues
- Signed Stripe webhook accepted

Stripe Checkout is the hosted payment flow recommended for this use case. [Stripe Checkout documentation](https://docs.stripe.com/payments/checkout) Prodigi sandbox orders are not charged or fulfilled. [Prodigi API documentation](https://www.prodigi.com/print-api/docs/reference/)

## 3. Human steps before real customers

- Replace the temporary Stripe sandbox credentials with permanent live Stripe keys.
- Replace the temporary Prodigi sandbox key and switch the API base URL from `api.sandbox.prodigi.com` to `api.prodigi.com`.
- Claim or recreate the temporary Stripe sandbox before it expires on September 12, 2026.
- Confirm live Prodigi SKU availability, pricing, shipping, and garment variants.
- Add production tax handling, refund policy, privacy policy, terms, customer support email, and a custom domain.
- Verify the live Stripe webhook endpoint and secret. Stripe requires raw-body signature verification. [Stripe webhook guidance](https://docs.stripe.com/webhooks/signature)

## 4. Limitations and assumptions

- Single product, black Gildan SoftStyle tee, US-only shipping, $22.50 price, free shipping.
- No order database or admin dashboard; Stripe metadata and Prodigi records are the source of truth.
- The local fulfillment flow requires a public HTTPS `SITE_URL` so Prodigi can download artwork.
- Browser automation was unavailable, so the hosted card-entry UI was not clicked manually; API and deployment verification succeeded.

## 5. Key decisions

- Stripe Checkout handles payment, shipping address collection, and receipts.
- Prodigi replaces Scalable Press using verified apparel SKUs:
  - Fitted: `A-WT-GD64000L`
  - Unisex: `A-MT-GD64000`
- Fulfillment runs both after return and through a signed webhook for recovery if the customer closes the browser.
- The timestamp is generated server-side as a print-ready PNG so the garment artwork matches the purchased moment exactly.

## 6. Friction encountered

- The first Vercel build failed because an unused starter preview component still referenced a removed dependency; fixed and redeployed.
- Vercel preview protection initially blocked unauthenticated access; disabled for this run-specific project.
- Stripe Projects initialization requires claiming the temporary sandbox through a browser; the browser surface was unavailable, so I used Stripe CLI sandbox provisioning and the Stripe API directly.