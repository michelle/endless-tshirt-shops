# Elsewhere — Wear your somewhere

A custom landscape keepsake tee store on OpenAI Sites / Cloudflare Workers, with D1 orders and R2 print files.

Store: https://elsewhere-memory-press.hazelcough.chatgpt.site
Owner ledger: https://elsewhere-memory-press.hazelcough.chatgpt.site/admin

## Current status

This deployment is a clearly labeled demo. The provided Prodigi sandbox key is a hosted secret. No Stripe account key was available: visitors cannot currently make real or Stripe-test payments. Demo confirmations never call Prodigi or represent paid orders.

Prodigi product lookup and a Standard US sandbox quote succeeded. Sand / M / front-print Gildan 64000: $11 item + $10.75 shipping = $21.75 before applicable tax. Customer price: $38 tee + $6 shipping = $44 USD. Reconfirm live costs and margin.

## Design and print

Customers choose desert, coast, or mountain; place, date, dedication; three palettes; sand/white/black; and S–2XL. Their text and date deterministically change the landscape composition and field number. This is landscape art, not a geographic map.

The same artwork generator drives preview and print. The browser exports a 4677 × 5881 PNG with transparent margins and 3300 px artwork width. The order saves that exact PNG immutably in R2 before checkout. Prodigi receives the saved file, not a mockup. The verified US variant print dimensions are 4677 × 5881; fitPrintArea preserves the image at other fulfillment locations.

The editorial photograph is illustrative. Physical product is Gildan 64000. Order samples to approve actual print color, placement, size, and fit.

## Test the deployed demo

1. Open the store, customize a landscape, place, date, dedication, palette, color, and size.
2. Check both preview tabs and download the transparent PNG.
3. Check the design approval box and click Preview a demo order.
4. Click Preview demo confirmation. It explicitly confirms no payment or print submission.
5. Reload to verify saved data. Order access requires the browser that created it.
6. Open /admin, sign in with the site's owner ChatGPT account, and view the ledger.

## Enable Stripe test checkout

Set hosted secrets STRIPE_SECRET_KEY (owner's sk_test_ key) and STRIPE_WEBHOOK_SECRET.

Create a Stripe webhook endpoint:
https://elsewhere-memory-press.hazelcough.chatgpt.site/api/webhooks/stripe

Select checkout.session.completed and checkout.session.async_payment_succeeded. Keep PRODIGI_ENV=sandbox; set DEMO_MODE=false; redeploy to apply runtime changes.

The integration pins Stripe API version 2025-02-24.acacia. It uses hosted card Checkout, US shipping address collection, one tee per order, $38 item price + $6 shipping. Cards never touch this server.

Use test card 4242 4242 4242 4242, a future expiry, and any three-digit CVC; provide a valid US test shipping address. Successful test payment should create a Prodigi sandbox order and show its reference. Cancellation or decline must leave it unsubmitted. Replay the same webhook / retry confirmation to check duplicate protection. Test successful payment with the browser closed to verify webhook fulfillment.

## Payment controls

Webhook verification uses the raw body, HMAC-SHA256, multiple v1 signatures, and a five-minute timestamp tolerance. The server independently fetches the session from Stripe.

Fulfillment requires a matching session ID, metadata order ID, and client reference; a complete payment session with payment_status=paid; exactly 4400 cents in USD; matching live/test mode; a valid US address; and no prior Prodigi reference.

D1 atomically claims submissions. Stale claims can retry after 90 seconds. Stripe creation and Prodigi submission use stable order-specific idempotency keys. Failures return errors for Stripe's retries and remain visible to the owner. Manual retries always verify payment again.

Order status requires a 256-bit token stored hashed in D1 and returns no shipping PII. Print files use separate unguessable keys. Same-origin writes and 20-per-IP/hour checkout limits apply. The owner ledger matches platform-authenticated email against a hosted OWNER_EMAIL secret.

## Production next steps and gaps

- Complete Stripe onboarding; configure live Stripe secret and live webhook signing secret.
- Configure live Prodigi key and billing; set PRODIGI_ENV=live and DEMO_MODE=false, then redeploy. A test/live mismatch disables checkout.
- First run actual Stripe test payment → Prodigi sandbox fulfillment. This end-to-end test was blocked by missing Stripe credentials during the build.
- Order samples of all three colors and approve size, fit, color, placement, and text readability.
- Finalize business identity, customer support, privacy, return/defect/cancellation policies, delivery expectations, and applicable taxes. Tax calculation is not enabled; payment amount validation needs adjustment if tax changes the total.
- Confirm live supplier costs, margins, and variant availability. Current checkout supports US only and one tee per order.
- Add transactional email, monitoring/alerts, durable reconciliation beyond Stripe's webhook retry window, and cleanup/retention of unpaid and demo assets.
- Add email/account order access if desired. Current access is browser-local; losing local storage loses customer access, while the owner retains the ledger.
- Manage refunds in Stripe and cancellation/production in Prodigi dashboards. Refund and cancellation automation is not implemented.

## Development and validation

Use Node 22.13+ (tested Node 22.23.3). Preserve the Sites starter's build integration. Install dependencies with the Sites install-dependencies.mjs helper.

Local demo: create ignored .dev.vars containing DEMO_MODE=true, PRODIGI_ENV=sandbox, SITE_URL=http://127.0.0.1:5173; then npm run dev. Do not put credentials in source.

Generate migrations with npm run db:generate. Local and hosted databases are separate. Build to get dist/server/wrangler.json, then run Wrangler d1 execute DB locally with that config, .wrangler/state persistence, and drizzle/0000_lush_amazoness.sql. Sites applies hosted migrations on deploy.

Checks:
- npx tsc --noEmit
- node --experimental-strip-types --test tests/commerce.test.ts
- node /Users/mchl/.codex/plugins/cache/openai-curated-remote/sites/1.0.0-c/scripts/build-site.mjs

Tests cover payment gates, webhook forgery/timestamps, SKU/asset/idempotency payloads, input validation, and deterministic escaped artwork. Browser QA covered customization, full-resolution upload, demo order persistence/confirmation, and mobile layout. Physical print quality and actual Stripe payment processing remain unverified.

API references:
https://docs.stripe.com/checkout/fulfillment
https://docs.stripe.com/webhooks/signature
https://www.prodigi.com/print-api/docs/reference/
https://www.prodigi.com/products/mens-clothing/t-shirts/classic/gildan-64000/
