# Elsewhere Club

Public store: https://elsewhere-club-personal-tees.hazelcough.chatgpt.site

Personalized travel poster tees: place, date, dedication, landscape, palette, shirt color, and size. A deterministic illustration changes with the customer’s story. The exact artwork is previewed on a tee and exported as a transparent 2490 × 3510 PNG.

## Current status

Deployed on Sites / Cloudflare Workers with D1 orders and R2 print assets. The supplied Prodigi sandbox key is stored as a hosting secret. Real product availability and shipping quotes were verified. No Stripe account secret key was supplied. Personalization, previews, downloads, and real sandbox quotes work; checkout explicitly refuses payment until Stripe is connected. No actual payment or payment-funded Prodigi order has been tested. Tests use explicit Stripe fixtures.

## Connect Stripe and test

1. Add your Stripe sandbox secret key as STRIPE_SECRET_KEY through Sites environment variables. Never commit it. Hosted Checkout needs no publishable key.
2. Create a Stripe event destination at https://elsewhere-club-personal-tees.hazelcough.chatgpt.site/api/stripe/webhook for checkout.session.completed and checkout.session.async_payment_succeeded. Store its signing secret as STRIPE_WEBHOOK_SECRET.
3. Keep PRODIGI_ENV=sandbox and the supplied sandbox PRODIGI_API_KEY. Redeploy a saved version to apply environment changes.
4. Personalize a tee, select size and color, approve the preview, and continue to Stripe. Use test card 4242 4242 4242 4242, any future expiry and three-digit CVC. Use fictitious US delivery details and a test email.
5. On return, see verified payment and a Prodigi order ID. Verify in Prodigi sandbox dashboard. No physical shirt ships. Save your order URL privately: it contains a bearer token.
6. Cancel checkout or use declined test card 4000 0000 0000 0002. Neither should submit a print order. Redeliver a success webhook to check duplicate protection. Refresh your order page after temporary fulfillment failure to retry.

## Payment / printing architecture

The server validates customization and PNG dimensions, obtains a fresh US shipping quote, saves the immutable asset and order, and creates a server-priced Stripe Checkout Session ($38 + quoted standard shipping). Stripe collects card and delivery details; no card data enters our application.

Both a signed Stripe webhook and the private order-status page invoke the same fulfillment function. It fetches the Checkout Session directly from Stripe and requires paid, complete, exact amount/currency/order metadata, and stored session ID. A D1 claim prevents concurrent submissions; a permanent Prodigi idempotencyKey prevents duplicates even after uncertain network failures. Failed print requests remain paid and retryable. Test payments cannot create live print orders. Live checkout requires PRODIGI_ENV=live and LAUNCH_READY=true.

Product: GLOBAL-TEE-GIL-64000, black/white, S–2XL, front only, fitPrintArea. Transparent margins set chest placement. Assets use unguessable UUID URLs for Prodigi download; never put delivery details into artwork. The browser renders the SVG into PNG; server validation checks PNG format/dimensions but does not prove uploaded pixels match chosen text. Assets/design are fixed when checkout starts.

## Development

Node 22+ required. Run npm ci, npm run build, npm test, npx wrangler d1 migrations apply elsewhere-local --local, and npm run dev. Use ignored .dev.vars for local secrets. PUBLIC_URL must be a public tunnel origin for Prodigi to download local print assets; localhost is unsuitable. Stripe CLI can forward local webhook events. npm run db:generate appends schema migrations. Never rewrite deployed migrations.

## Production work / known gaps

- Connect and test your Stripe account. Complete business activation, use live Stripe and webhook keys plus the corresponding Prodigi live key, set PRODIGI_ENV=live and LAUNCH_READY=true, and redeploy.
- Order physical samples for each color. Verify print quality, color, sizing, and chest placement; digital previews do not establish physical results.
- Taxes are not collected. Obtain registrations, integrate Stripe Tax and tax-aware amount reconciliation before real sales. Supplier quotes warn that supplier sales tax may apply. Live checkout is disabled pending launch configuration.
- Establish business identity, support email, shipping estimates, returns/refunds/defect and privacy policies, and retention/deletion procedures. The sandbox storefront says its support/return policy is unfinished.
- US delivery, one shirt per checkout. No cart, accounts, coupons, bulk ordering, or guaranteed delivery date.
- Add edge rate limits/bot protection, operational monitoring, and abandoned order/asset cleanup. Current assets persist indefinitely.
- Webhook errors trigger provider retries, and private order page visits also retry printing. No autonomous recovery scheduler, alerts, recovery queue, or staff order dashboard yet.
- No automatic refunds, cancellation, or transactional email service. Enable Stripe receipts in its dashboard. Status shows tracking numbers when returned by Prodigi.
- Real Stripe checkout, live tax reconciliation, and physical output are unverified. Nine automated tests cover design validation, print resolution, payment gating, signed webhooks, duplicate protection, and retries.

References: https://www.prodigi.com/print-api/docs/reference/ ; https://www.prodigi.com/products/mens-clothing/t-shirts/classic/gildan-64000/ ; https://docs.stripe.com/checkout/fulfillment ; https://docs.stripe.com/testing
