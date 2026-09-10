# Personal Best

A personalized DTG t-shirt store. Customers create an outdoors club with a place, club name, motto, founding year, ink palette, and procedural contour seed. The contour artwork is original abstract art, not a geographic map. Generated font outlines make preview and print typography consistent. Generated shirt photography is an illustrative mockup.

## Deployment and current limitation

Store URL: https://benchmark-20260910-prompt-v3-high-c.vercel.app

Deployed to the run-specific Vercel project named by BENCHMARK_VERCEL_PROJECT. Stripe Checkout is fully implemented, but the supplied BENCHMARK_STRIPE_CONFIG file was empty. No Stripe secret key or webhook signing secret was available, so checkout is intentionally disabled. No real Stripe payment or Prodigi order was created. This is a deployed sandbox storefront, not an operational live business.

## Activate Stripe test checkout

1. Obtain a Stripe sandbox secret key from your Stripe account. Use a key with Checkout Sessions and Webhook Endpoints permissions. Keep it out of Git and chat.
2. In this checkout, set STRIPE_SECRET_KEY securely in your shell and set STORE_URL to the deployed origin.
3. Run `npm run setup:stripe`. It creates a Stripe webhook for `/api/webhook` and saves both secrets to this project's Vercel production environment using stdin. It does not print secrets. Run this once per environment; rerunning creates another endpoint, which should be deleted in Stripe if unused.
4. Run `vercel --prod --yes`. Vercel's **production deployment** still uses Stripe **test mode** and Prodigi **sandbox**.
5. Visit `/api/config` and confirm `checkoutReady: true` and `mode: sandbox`.

No Stripe publishable key is required: customers pay on Stripe-hosted Checkout.

## Test the deployed store

- Change every field, ink palette, size, and contour number. Preview the artwork and download the SVG. Reload: your design persists on this device. Try an inspiration preset and inspect the size guide.
- Once test Stripe is configured, check the design approval box and proceed to checkout. Use `4242 4242 4242 4242`, any future expiry, any three-digit CVC, a test US shipping address, and an email you control. You should return to `/order?session_id=...`, see payment confirmed, and get a Prodigi sandbox reference.
- Verify the same reference in Prodigi's sandbox dashboard. Verify the incoming artwork PNG downloads, and inspect the full order status for any asset or lab errors. Production acceptance cannot be confirmed before this test.
- Stripe decline card: `4000 0000 0000 0002`. A declined or abandoned checkout must create no Prodigi order.
- Resend the actual `checkout.session.completed` event from Stripe Workbench. Refresh the order page concurrently. The same Prodigi idempotency key and order reference must be reused.
- Test webhook delivery without visiting the success page. The webhook must submit the print independently.
- Unit tests: `npm test`. Build/typecheck: `npm run build`. `npm audit` was clean at delivery.

## Architecture and safety

Vite + React frontend, Express Vercel function, Stripe-hosted Checkout, Prodigi v4 API. Server-owned prices: $38 shirt + $6 standard US shipping, tax added only if STRIPE_AUTOMATIC_TAX=true. One white Gildan 5000 (GLOBAL-TEE-GIL-5000), S/M/L/XL/2XL, per order.

A live Prodigi quote checks availability before Checkout. The sandbox quote returned $20.75 supplier cost for size M ($10 shirt + $10.75 shipping), excluding possible sales tax; the retail price subsidizes part of shipping. Quote warnings are rejected except the documented US sales-tax warning.

All checkout inputs are validated. Customer-supplied prices/SKUs are rejected. Stripe stores the immutable design and its hash in Checkout Session metadata. Raw webhook bytes are signature-verified. Both the webhook and order return page independently re-fetch the session from Stripe and require paid status, correct store, mode, currency, amount, shipping total, and design hash. No public route can submit an unverified order.

Fulfillment sends a server-signed 4677×5881 transparent PNG at 300 DPI with outlined typography, plus the recipient address obtained from Stripe. Prodigi idempotency is based on the Stripe session ID, making webhook retries and concurrent return-page requests safe. The Prodigi order ID is then saved to Stripe metadata. A failure before metadata persistence is safe to retry using the same printer idempotency key. Stripe is the durable order store; no ephemeral filesystem or browser storage is used for orders. Do not change the art generator or signing key without preserving access to existing ordered artwork URLs.

Customer order links are bearer capabilities: keep them private. They return design and print status, not name, email, address, or payment details. Do not add analytics that capture their session ID. Artwork links are signed and contain the buyer's requested print text, not shipping details.

## Production launch work

- Complete Stripe account onboarding, activate live payments, and configure a LIVE Stripe webhook. Add live STRIPE_SECRET_KEY and matching STRIPE_WEBHOOK_SECRET.
- Add a live Prodigi API key and billing method. Set PRODIGI_ENV=live and LIVE_FULFILLMENT_ENABLED=true only after approval of physical samples. Live Stripe and live Prodigi must be enabled together; mismatches disable checkout.
- Set STORE_URL to a stable custom HTTPS domain. Preserve ART_SIGNING_SECRET and the v1 artwork renderer for order retention. Add persistent versioned artwork storage before evolving the renderer.
- Establish tax registrations and configure Stripe Tax as appropriate; set STRIPE_AUTOMATIC_TAX=true after configuration. Confirm wholesale cost, fulfillment regions, margins, and shipping expectations for all sizes. Taxes are not enabled in this sandbox.
- Publish real business/support contact details, privacy policy, terms, personalized-item return policy, defect/refund handling, and cancellation workflow. Current on-page notices explicitly describe a sandbox; they are not complete live-store policies.
- Enable receipts in Stripe. Add transactional print/shipping emails if wanted; no separate email service is configured.
- Add operational alerting, durable reconciliation/queueing, and an admin process for paid orders pending fulfillment, CreatedWithIssues, refunds, cancellations, and exhausted Stripe webhook retries. Current transient failures return 500 for Stripe retry and the return page retries; no scheduled reconciliation or operator notification exists.
- Add edge rate limiting/bot protection before public marketing. Verify refund-before-fulfillment handling and reconcile chargebacks manually until an order operations workflow is implemented.
- Test a real physical sample for fit, print placement, color, durability, and shipping before accepting public orders. Mockup is illustrative; print-to-garment placement requires physical QA.

## Verification performed

12 automated tests cover unpaid/mismatched/altered payment rejection, server design validation, concurrency idempotency payloads, replay short-circuit, failed printer retries, destination checks, artwork signatures, deterministic rendering, full-resolution transparent PNG output, and missing-secret fail-closed behavior, and raw-byte webhook signature verification. Mocked provider tests do not prove a real end-to-end payment/print order. The actual Prodigi product and quote endpoints were exercised. Production build and deployed HTTP smoke checks performed.

No browser automation was performed. Optional WebMCP configuration tool is feature-detected; registration was not verified in a supported WebMCP browser.

## Local development

`npm install`, copy `.env.example` to `.env.local`, supply secrets locally, then `node --env-file=.env.local --import tsx server.ts`. Local URL is http://127.0.0.1:43177. A Stripe CLI forwarding secret differs from a hosted endpoint signing secret; use the matching one locally. `npm run dev` assumes environment variables have already been exported.

## Sources

- https://docs.stripe.com/checkout/fulfillment
- https://www.prodigi.com/print-api/docs/reference/
- https://www.prodigi.com/products/mens-clothing/t-shirts/classic/gildan-5000/
- Space Mono font: Google Fonts, SIL OFL, license bundled in public/fonts/OFL.txt.
