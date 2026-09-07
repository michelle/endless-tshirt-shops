# datetime.store

Deployed test storefront: https://datetime-20260906-6b537472.vercel.app

Vercel project: `benchmark-20260906-minimal-inspector-high-codex-gpt-6-astra`.

A rebuild of [michelle/datetime.store](https://github.com/michelle/datetime.store): a black tee printed with the Unix timestamp captured when checkout begins. Uses Next.js App Router, Stripe hosted Checkout and Prodigi Print API v4. Vercel is the deployment target. The scaffold's Sites/Vinext dependencies are retained, but the application is built with Next.js for native Vercel server functions.

## Local development

Use Node 22.13 or newer. Run `npm ci`, copy `.env.example` to `.env.local`, configure the server credentials, then run `npm run dev`. Set `APP_URL=http://localhost:3000` locally. A public deployment URL is required for Prodigi to fetch print artwork.

Checks: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.

## Purchase and fulfillment

1. The millisecond clock runs in the browser. The checkout button freezes it and posts the chosen fit, size, timestamp and retry UUID. The server validates all input, checks clock drift, obtains a Prodigi US quote and creates a $22.50 Stripe Checkout Session. No client-provided prices, SKUs or artwork URLs are accepted.
2. Stripe collects shipping and payment details. Only US shipping and card payments are enabled. Payment data stays with Stripe. Metadata stores the exact timestamp and garment selection durably.
3. A verified Stripe webhook retrieves the session from Stripe, verifies paid status, amount, currency, product and test/live environment, then creates a Prodigi order. Never fulfill based on the webhook payload alone or the success-page URL.
4. Prodigi uses the Checkout Session ID as its indefinitely retained idempotency key. Stripe session metadata stores the returned Prodigi order ID. This prevents duplicates across webhook retries, concurrent requests, return-page recovery and crashes between order creation and metadata persistence.
5. The success page can invoke the same idempotent fulfillment routine as a recovery path and polls when pending. Failed webhook fulfillment responds with HTTP 500 so Stripe retries. No personal details are exposed by the order-status API; the unguessable session ID is the order access token.
6. Artwork is a signed, deterministic transparent PNG generated from a bundled, licensed IBM Plex Mono font converted to vector paths. It uses each product's API-reported print-area dimensions at 300 DPI. Prodigi downloads it over HTTPS. Do not rotate `ARTWORK_SIGNING_SECRET` while orders are processing.

Catalog: Unisex `GLOBAL-TEE-BC-3001`; fitted `GLOBAL-TEE-BC-6004`; black, S/M/L/XL; front print. The product photo is an AI-generated illustrative mockup. Exact cut and print placement require a physical sample.

## Environment

All credentials are server-only and excluded from Git. See `.env.example`. Production Vercel variables are already set for this run. `scripts/setup-webhook.mjs` is only for setting up a new Stripe account; do not rerun it on the existing sandbox. `scripts/push-env.mjs` copies configured local values to the linked Vercel project.

Webhook URL: `/api/stripe/webhook`. Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`. Register the raw endpoint secret as `STRIPE_WEBHOOK_SECRET`.

The test deployment blocks mismatched payment/fulfillment environments. Live orders require a live Stripe key, live Prodigi key, `PRODIGI_ENVIRONMENT=live` AND `ENABLE_LIVE_ORDERS=true`.

## Test the deployed store

Choose a fit and size, press **Make this moment yours**, and complete Stripe Checkout using test card **4242 4242 4242 4242**, a future expiry, any three-digit CVC, and a US address. Use test information. On return, confirm that the timestamp and variant match and a Prodigi order reference appears. Refresh the page and resend the Stripe event: the Prodigi order reference must stay the same. Cancel checkout to test recovery; use Stripe's declining test card **4000 0000 0000 0002** to test declines.

`node --import tsx scripts/smoke-test.ts --place-sandbox-order` runs the deployed API checks and submits two explicitly marked sandbox print orders, with a separate Stripe test PaymentIntent. It checks checkout creation and idempotency, input/origin/signature validation, unpaid protection, signed public artwork and Prodigi deduplication. It does not complete the hosted browser Checkout UI. Results are written to `reports/smoke-test.json`.

## Before real customers

- Claim the temporary Stripe sandbox before its expiry (September 13, 2026). The handoff includes the claim link. Alternatively use your own permanent Stripe account and recreate the webhook there.
- Complete a hosted test checkout and verify its actual `checkout.session.completed` webhook creates a Prodigi order. Browser UI QA and WebMCP runtime validation have not been performed in this run.
- Order physical samples of both cuts and confirm fabric, sizing, ink size and placement. Replace the illustrative image with sample photography.
- Review unit economics, tax settings and delivery promises. Sandbox M quotes were $16.90 unisex and $18.35 fitted including standard US shipping, excluding sales tax; these are observations, not fixed supplier prices. Checkout uses the original $22.50 price. No sales tax calculation is configured yet.
- Publish your support contact, return/refund terms, final privacy policy and business details. Add receipt/customer support communication and shipping notifications if needed; no custom transactional email service is configured.
- Monitor Vercel `fulfillment_failed` logs, failed Stripe webhook deliveries, and Prodigi orders with issues. Configure alerting and an operator workflow for fulfillment failures/refunds. Stripe retries are the queue; recovery after the Stripe retry window requires resending the event. There is no separate admin dashboard or background reconciliation job.
- Set up rate limits in the Vercel firewall before launch. Application endpoints validate inputs/origins but do not use a shared rate-limit database.
- Update all test-mode copy and robots restrictions, configure the final domain and `APP_URL`, update webhook URL, set live credentials and the explicit live-order flag, then redeploy. Never merely swap credentials while leaving test messaging in place.

## Sources and licenses

Behavioral reference: https://github.com/michelle/datetime.store

Prodigi API: https://www.prodigi.com/print-api/docs/reference/

Product details and size references: https://www.prodigi.com/products/mens-clothing/t-shirts/classic/bella-canvas-3001/ and https://www.prodigi.com/products/womens-clothing/t-shirts/classic/bella-canvas-6004/

IBM Plex Mono font license: `public/fonts/OFL.txt`. Shirt mockup generated for this project.
