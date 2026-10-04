# ELSEWHERE — a place in time

A personalized, print-on-demand T-shirt store. Customers enter a place, date and dedication; these seed a deterministic original orbital design. Three ink palettes, black Gildan 64000 cotton tees in S–2XL, one shirt per checkout, US shipping only.

## Current deployment

Public site: https://elsewhere-personal-prints.hazelcough.chatgpt.site

Hosted with Sites on Cloudflare Workers, D1 (orders), and R2 (immutable print PDFs). Prodigi sandbox credential is configured as a hosted secret. **Stripe credentials are not supplied, so payments remain disabled. This is not yet a fully operational selling store.** There is no simulated payment button and no unpaid fulfillment bypass.

## Payment and fulfillment architecture

1. Server validates and normalizes personalization and size; prices are server-owned ($42 + $6 shipping, USD).
2. An authenticated Prodigi quote checks the selected product/destination before collecting payment.
3. Server generates and saves a transparent vector PDF print master in R2; D1 stores the approved design and private access tokens.
4. Server creates a Stripe-hosted card Checkout Session and saves its ID. Stripe collects the shipping address, email, and phone. Full card data never passes through this app.
5. Signed Stripe webhook events and the private return page both invoke the same fulfillment function. It retrieves the Checkout Session directly from Stripe and verifies paid/completed state, exact amount, currency, order reference, session ID, and live/test mode.
6. A D1 lease prevents concurrent submissions. A permanent Prodigi idempotency key (the order UUID) protects retries after a network failure or crash. Only verified paid orders are submitted.
7. The private order page shows separate payment, submission and print-partner status; failed submission preserves paid state and offers a retry. Webhook failures return 500 for Stripe retry.

`GET /api/order` is read-only. `POST /api/order/sync` needs the private order token. Artwork URLs contain separate high-entropy bearer tokens and no shipping details. The app does not email anyone; Stripe receipt email settings are controlled by your account.

## Enable test payments

Configure these **Sites runtime secrets**, then redeploy the saved version to apply them:

- `STRIPE_SECRET_KEY`: your account's `sk_test_…` key.
- `STRIPE_WEBHOOK_SECRET`: the `whsec_…` signing secret from the endpoint below.

In Stripe **test mode**, create a webhook endpoint:

`https://elsewhere-personal-prints.hazelcough.chatgpt.site/api/webhooks/stripe`

Select `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `checkout.session.expired`. Use API version `2025-02-24.acacia` (the server pins this version for API calls). The webhook only uses the event to identify an order and always retrieves the authoritative session itself. Keep `STORE_MODE=sandbox` and the sandbox Prodigi key. Never put secrets in client code, the hosting manifest or source control.

## Test the store

1. Change the place, date, words and palette; confirm the preview and orbit ID update. Switch between shirt and artwork views, enlarge the art, consult sizing and download the PDF proof. Empty/invalid dates or unsupported characters must show a validation message.
2. After configuring Stripe, approve the design and select Checkout. For success use `4242 4242 4242 4242`, any future expiry, any 3-digit CVC and a valid US test address. Use no real personal or card data for sandbox testing.
3. Expect Stripe's success return to show payment confirmed, followed by a Prodigi sandbox order reference. Confirm the matching merchant reference in the Prodigi sandbox dashboard. No physical shirt ships in sandbox.
4. Refresh the order and resend the Stripe event: the same Prodigi order must be reused.
5. Use Stripe's decline test card `4000 0000 0000 0002` or cancel Checkout: no Prodigi order should be created. An unsigned webhook must be rejected. For authentication testing use `4000 0025 0000 3155`.
6. Test on a phone and desktop. Check the generated PDF at full size and order a physical sample before launch.

## Development and validation

Node 24 is recommended (minimum 22.13). `npm ci`; copy `.env.example` to `.env` and fill only test secrets. Local preview is `npm run dev`. D1 migrations are in `drizzle/`; use the starter's local migration workflow in `scripts/` when testing persisted local orders. Hosted migrations are applied by Sites during deployment.

- `node tests/run.mjs`: 10 behavioral tests, with real in-memory SQLite and mocked provider HTTP. Covers deterministic art, invalid input, webhook signature/timestamp checks, unpaid suppression, amount/currency/order/mode mismatch, replay and concurrency, fulfillment recovery and address validation.
- `npx tsc --noEmit`: static type check.
- `npm run build`: Cloudflare Worker build (normally run by Sites publishing).

Tests deliberately mock Stripe/Prodigi and do not claim a real end-to-end payment. Prodigi product lookup and an actual sandbox quote were verified. Real Stripe checkout, webhook delivery and post-payment Prodigi submission remain unverified until test credentials are configured.

## Print specification

The same geometry drives browser SVG and server PDF; the server never accepts a client-supplied print file. PDF is vector, one page, no background rectangle, Helvetica fonts embedded. Page size is 15.59 × 19.603 inches, corresponding to a Prodigi front area of 4677 × 5881 pixels at 300 dpi. Colored strokes are approximately 3.30 points wide; the main motif is roughly 10–11 inches across. `fitPrintArea` prevents cropping if the allocated print lab uses another supported aspect ratio. Actual sizing/placement can vary by print lab and shirt size. Confirm the PDF transparency and white underbase on a physical sample; PDF support alone is not proof of print quality. The shirt photograph is an AI-generated illustrative mockup, not a sampled garment.

## Before accepting real orders

- Complete a real Stripe test checkout, webhook replay, failed payment and Prodigi sandbox submission; inspect asset download/processing status.
- Complete Stripe account activation and business verification. Obtain the correct live Prodigi key, billing setup and shipping settings. Verify real product costs and margins; sandbox quotes are not a guaranteed live price.
- Publish merchant identity, contact/support email, realistic delivery estimates, cancellation/returns/defect policy, privacy retention/deletion policy, and applicable terms. Current on-site terms explicitly describe sandbox limitations and must be replaced for commerce.
- Determine tax obligations. The present $48 sandbox checkout does **not** calculate sales tax. Implement Stripe Tax and update exact-amount verification to include server-authorized taxes, or deliberately implement an appropriate tax-inclusive policy. Do this before enabling live checkout.
- Order and approve physical samples in each palette, including smallest and largest sizes. Confirm dimensions, placement, color/underbase and wash durability with Prodigi; tune the print template if needed.
- Add operational alerting, a merchant order/refund workflow, support contact, automated reconciliation beyond Stripe's retry window, rate limits/abuse prevention, and retention cleanup for abandoned orders/assets. Refunds/cancellations currently require Stripe/Prodigi dashboards and manual coordination.
- Configure live Stripe key and a separate live webhook signing secret; set `STORE_MODE=live`, live `PRODIGI_API_KEY`, and only after the above work, `PRODUCTION_READY=true`. Redeploy. The code rejects test/live key mismatches; a live key alone cannot enable checkout.
- Optionally connect a custom domain and update `SITE_URL`, Stripe webhook endpoint and redirects together. Keep the public artwork path accessible to Prodigi.

## Known scope limitations

US only; one shirt per Checkout; S–2XL; black shirt only; English/basic Latin letters and simple punctuation; no product cart, accounts, email provider, merchant admin UI, automatic refunds or customer address changes after payment. Private order links are bearer access, so do not share them. Art reflects the customer's text through an algorithm; it is not a geographic or astronomical map. The orbit ID is decorative and not a uniqueness guarantee.

## Official references

- Stripe Checkout fulfillment: https://docs.stripe.com/checkout/fulfillment
- Stripe testing: https://docs.stripe.com/testing
- Prodigi API (orders, quotes, product details, idempotency): https://www.prodigi.com/print-api/docs/reference/
- Gildan 64000 product: https://www.prodigi.com/products/mens-clothing/t-shirts/classic/gildan-64000/
