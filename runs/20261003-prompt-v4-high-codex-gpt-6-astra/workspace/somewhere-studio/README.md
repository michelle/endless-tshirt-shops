# Somewhere Studio

Personalized wearable postcards: original mountain-and-river art, customer place name, caption, date, palette, and size. US-only, one navy Bella+Canvas 3001 per checkout. $42 + $6 shipping.

Public site: https://somewhere-studio.hazelcough.chatgpt.site

## Current status

Deployed public preview with a working designer and high-resolution PNG download. Prodigi sandbox key configured as a server secret. **Stripe credentials were not provided. Checkout deliberately remains disabled. No actual Stripe payment or end-to-end Prodigi order has been verified.** Do not describe the current deployment as a payment-ready store.

The integration code uses Stripe-hosted Checkout, signed webhooks, server-side session retrieval, exact amount/currency/order/mode validation, durable D1 orders, and R2 artwork. Prodigi is called only after verified payment. Permanent provider idempotency keys and conditional database updates protect retries and concurrent webhook events. The success page can recover fulfillment using the same server-verified path; it never trusts a success URL as payment evidence.

## Connect test payments

1. Obtain a Stripe test secret key from your own merchant account. Store it in Sites runtime secrets as `STRIPE_SECRET_KEY` (starts with `sk_test_`). Never put it in source, client code, or a NEXT_PUBLIC variable.
2. Register a Stripe webhook destination at `https://somewhere-studio.hazelcough.chatgpt.site/api/stripe/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Store the signing secret as `STRIPE_WEBHOOK_SECRET` (starts with `whsec_`).
3. Keep `STORE_MODE=sandbox`, `PRODIGI_MODE=sandbox`, the provided sandbox `PRODIGI_API_KEY`, and `SITE_URL=https://somewhere-studio.hazelcough.chatgpt.site`.
4. Republish so runtime environment changes are applied. Checkout activates only if both Stripe secrets and the Prodigi key are present and the environment modes agree.
5. Customize a tee, check the approval box, and pay with Stripe test card `4242 4242 4242 4242`, a future expiry, any three-digit CVC, and fictional US shipping details. Use `4000 0000 0000 0002` for a declined payment. No real charge or physical shipment should occur in sandbox.
6. Confirm the successful order page displays a Prodigi order reference, and verify the downloaded front artwork and variant in the Prodigi sandbox dashboard. Keep the private order URL; its token grants access to that order and artwork.
7. Redeliver the paid event from Stripe and confirm the same Prodigi reference persists. Declined or abandoned checkouts must never produce a print order. Inspect Stripe webhook delivery failures and retry events after correcting any provider failure.

Official references: [Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment), [Stripe test cards](https://docs.stripe.com/testing), [Prodigi API](https://www.prodigi.com/print-api/docs/reference/), [shirt specifications](https://www.prodigi.com/products/mens-clothing/t-shirts/classic/bella-canvas-3001/).

## Validation performed

- TypeScript check and production Worker build.
- Real Prodigi sandbox product lookup for SKU `GLOBAL-TEE-BC-3001`: navy blue S/M/L/XL/2XL, US availability, required front print area.
- Real sandbox quote: US Standard shipping, M, navy. Returned $11.89 item + $4.62 shipping = $16.51 before any applicable sales tax. This is a sandbox quote, not a guaranteed production cost or delivery estimate.
- Browser checks: editable live artwork, palette/size controls, size guide, mobile layout, PNG download.
- Downloaded PNG verified at 4677 × 5881 RGBA, transparent background, matching the selected navy US variant's print-area pixels. Print has ample transparent margins, about 10.5 inches maximum illustration width at 300 ppi.
- `node tests/run.mjs` (Node 24) tests real application payment logic against SQLite and mocked Stripe/Prodigi responses: unpaid, amount mismatch, live/test mismatch, webhook tampering/expiry, failed fulfillment retry, concurrent/repeated events, origin checks, and missing credentials. These are automated simulations, not an external payment test.

## Production launch work

- Complete merchant account onboarding and the full external sandbox payment-to-print test above.
- Order and inspect a physical sample for color, size, placement, texture, and washing. Mockup is an AI-generated illustrative shirt, not a photographed finished sample. Base art has native resolution 1122 × 1402 and is raster-scaled into the print file; at the intended width it is approximately 107 native ppi. Typography is rendered at full print resolution. Use a higher-resolution master if a sample reveals softness.
- Set final shipping promises and commercial policies; add business identity, support email, cancellation/return terms, and privacy/data-retention policies. Current policy page is explicit preview copy that must be replaced for live operation.
- Configure tax treatment for the business and markets served. Current test checkout charges exactly $48 and does not calculate tax. If enabling Stripe Tax, update amount verification to validate the authoritative subtotal, shipping and tax breakdown, not the current fixed total.
- Add operational monitoring/alerts and durable retry scheduling for paid orders when webhooks exhaust their retries. Currently Stripe retries failed deliveries, the order page can retry, and permanent Prodigi idempotency prevents duplicates. There is no scheduled reconciliation worker or operator dashboard. Use Stripe/Prodigi dashboards for operations.
- Add transactional customer email, shipment tracking synchronization, refund/cancellation workflows, and customer support. Current status ends at acceptance by Prodigi, not delivery. Order lookup requires the private success URL.
- Add checkout rate limiting, retention cleanup for abandoned orders/artwork, and artwork content review as appropriate before opening broad public traffic. Uploaded print files come from the browser renderer and are checked for PNG header and dimensions; the server does not regenerate the image or moderate its content.
- The current collection accepts Latin letters, numbers, spaces and limited punctuation. It has one original landscape and three color treatments, no uploads, one item per checkout, five sizes, one shirt color and US shipping.
- Only after production setup and sample approval: configure live Stripe key/webhook secret and live Prodigi key, set both `STORE_MODE=live` and `PRODIGI_MODE=live`, update public policy/test copy, and republish. Never mix test payments with live printing. Live orders incur real printing and shipping charges.

## Development

Node 22.13+ for development/build; Node 24 for SQLite-backed tests.

```sh
npm install --include=optional
npm run dev
npx tsc --noEmit
node tests/run.mjs
npm run build
```

Application code: `app/page.tsx`, `app/globals.css`, `lib/design.ts`, `lib/payments.ts`, `app/api/**`.
D1 schema: `db/schema.ts`; immutable applied migrations: `drizzle/`.
R2 binding: `BUCKET`. D1 binding: `DB`.
Assets: original generated landscape and blank shirt mockup. Barlow Condensed font under SIL OFL (`public/art/OFL.txt`).

Keep secrets in runtime configuration or ignored local environment files. Deploy using the Sites workflow for the existing project ID in `.openai/hosting.json`; do not create another project for updates.
