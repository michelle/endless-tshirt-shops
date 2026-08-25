# datetime.store

A timestamp-shirt storefront rebuilt as a Next.js application. Checkout is hosted by Stripe; successful checkout sessions are sent to Prodigi for print-on-demand fulfillment.

## Local setup

1. Copy `.env.example` to `.env.local`, then add Stripe test keys and a Prodigi sandbox API key.
2. Run `npm install && npm run dev`.
3. Buy with Stripe test card `4242 4242 4242 4242`, any future expiry/CVC, and a US shipping address.

The return page verifies Stripe's payment status before submitting to Prodigi. In production, register `/api/stripe-webhook` for `checkout.session.completed` and set `STRIPE_WEBHOOK_SECRET` for reliable asynchronous fulfillment.

Set `PRODIGI_TSHIRT_SKU` to a black apparel SKU returned by the merchant account's Product Details endpoint, plus its supported print area/attributes. This is intentionally required: Prodigi's available apparel SKUs and option values are account/region-specific, and the shop should never send a paid order to a guessed garment SKU.
