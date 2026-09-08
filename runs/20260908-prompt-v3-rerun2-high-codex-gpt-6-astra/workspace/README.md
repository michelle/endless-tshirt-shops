# Daymark

A custom t-shirt store built with Next.js, Stripe Checkout, and Prodigi. The customer supplies a place, date, coordinates, and caption; those inputs generate a repeatable original contour composition, available in three color palettes. The contours are decorative, not actual terrain data.

## Deployment and current state

Public project URL: https://benchmark-20260908-prompt-v3-rerun2.vercel.app

Vercel project: `benchmark-20260908-prompt-v3-rerun2-high-codex-gpt-6-astra`.

Stripe test payments and Prodigi sandbox fulfillment are configured on the deployed Vercel store. A temporary Stripe sandbox was provisioned through the official Stripe CLI. **Claim it by September 15, 2026** using the private link in `.private/stripe-sandbox.md`; then replace the temporary key with permanent credentials and redeploy. That private file and all secret files are excluded from deployment and source control. The temporary account has limited permissions; Stripe account branding must be completed after claiming it.

The store accepts test payments only. Nothing is physically printed or shipped. A successful deployed $44 checkout produced Prodigi sandbox order `ord_1171056` through the signed webhook. Two simultaneous retries recovered that same order; an actual declined card remained unpaid and produced no print order.

## Test the deployed store

1. Open the public URL above, customize the place, coordinates, date, caption, palette, and size. The "The print" toggle shows the full outlined artwork. Refresh the page to verify the design is saved on your device.
2. Approve the design and select "Make this one mine". Stripe Checkout collects the email, card, and US shipping address. Expect $38 + $6 shipping = $44 USD.
3. Use Stripe's test card `4242 4242 4242 4242`, any future expiry, and any three-digit CVC. Use a US delivery address and a test email you control. These details do not cause a physical shipment.
4. After checkout, expect `Payment: Confirmed` and a Prodigi order ID. Verify that ID and the exact size, natural color, delivery details, and front PNG in the Prodigi sandbox dashboard. Save the private status link to refresh later.
5. Repeat with declined card `4000 0000 0000 0002`. Verify no corresponding Prodigi order. Cancel a checkout and confirm your design remains saved.
6. In Stripe, resend a `checkout.session.completed` webhook. It must not create another print order. The deployed integration has also been tested with the customer success-page request omitted.
7. Inspect the final asset and order a real sample before public sales. Production and asset-processing statuses may remain simulated in the Prodigi sandbox.

Official testing reference: https://docs.stripe.com/testing

## Configure another Stripe account

1. Export a Stripe test secret key securely as `STRIPE_SECRET_KEY` in your shell. Set `SITE_URL` to the actual public URL above, not a URL inferred from the long project name.
2. Run `node scripts/configure-stripe.mjs`. This creates a webhook for `checkout.session.completed` and `checkout.session.async_payment_succeeded`, then writes the API key and webhook signing secret to this Vercel project's production environment. Alternatively configure these in the provider dashboards. Remove obsolete webhook endpoints if replacing an existing configuration.
3. Run `vercel --prod --yes`. The root page reads configuration at build time, so redeployment is required.
4. Confirm `/api/health` reports payments, webhook, and fulfillment configured with environment `sandbox`; repeat the purchase tests.

## Architecture and safeguards

- `/api/checkout`: validates a bounded server-side schema, enforces same-origin requests, verifies the chosen Prodigi variant supports US delivery, and creates a single-item Checkout Session. Pricing, SKU, currency, quantity, shipping service, and allowed destination are server-controlled. Checkout requires payment, webhook, and art-signing configuration.
- Stripe holds durable order metadata: design, private order token, and Prodigi order ID. There is no ephemeral server filesystem database.
- `/api/webhooks/stripe`: verifies the Stripe signature against the exact raw body. Payment events cause a fresh retrieval of the Checkout Session. Errors return 500 so Stripe can retry.
- Fulfillment requires a completed session, paid status, expected USD total, correct store marker, and matching test/live environment. Refunded payment intents are rejected before a new submission. The shipping address comes from Stripe, never from client fulfillment parameters.
- `/api/order`: requires both a Stripe session ID and its private access token. It calls the same verified fulfillment path to handle delayed webhooks, then reads shipment information from Prodigi. It does not expose the shipping address or email.
- Prodigi uses the deterministic key `daymark:<stripe-session-id>` for every retry. This provider-side idempotency also covers concurrent webhook and success-page requests and a process dying before Stripe metadata updates.
- `/api/art`: validates an HMAC-signed design before rendering a transparent PNG. No shipping details or email are in the asset. The same design generator powers the customer preview and print file. IBM Plex Sans lettering is converted to vector outlines, avoiding missing-font differences between browser and server. Output is 2490×3510 at 300 DPI, matching the natural-color US variant returned by Prodigi's API, using `fitPrintArea` and the `front` print area. Keep the v1 generator and signing key stable for existing orders; future art changes should version the endpoint or persist immutable PNGs.
- Only one natural-color Bella+Canvas 3001 tee per checkout; sizes S, M, L, XL, 2XL; US delivery only. This keeps the initial paid flow explicit and reviewable.

## Verification performed

- Production build and TypeScript checks passed.
- Twelve automated tests cover unpaid/incomplete payments, amount/currency/store mismatches, environment mismatches, invalid customization, deterministic artwork, paid submission content, repeated/concurrent fulfillment, refunds/missing shipping, and provider failures. Run `npm test`.
- Actual Prodigi sandbox product calls verified all offered natural-color US size variants and their print dimensions.
- Actual sandbox quote returned $12 item + $10.75 shipping = $22.75 supplier cost for a medium natural shirt to the US, before potentially applicable tax. The customer-facing $6 shipping is a deliberate subsidy within the $44 retail total. The quote included a US sales-tax warning. Recheck actual live quotes before launch.
- Deployed HTTP checks passed: public pages and product image return 200; signed PNG returns 2490×3510; forged artwork, unsigned webhook, invalid order links, cross-origin checkout, and invalid design input are rejected. Checkout returns a usable Stripe-hosted payment URL when configured and fails closed when configuration is missing.
- Actual deployed sandbox integration passed: Stripe Checkout Session creation ($44), unpaid status, successful card confirmation using Stripe CLI’s official payment-page fixture pattern, signed webhook delivery, Prodigi order creation, concurrent duplicate recovery, declined-card response, and expired-session status. The paid event created `ord_1171056` with zero Prodigi issues. This used provider API testing, not a browser card-entry test. There is no fake successful payment path or unauthenticated fulfillment bypass.
- Browser interaction and responsive visual QA were not performed. The optional `configure_daymark_tee` WebMCP tool is feature-detected and has not been tested in a supporting browser.

## Before accepting real orders

1. Claim the temporary Stripe sandbox before September 15, 2026, using the private claim instructions. Finish Stripe business onboarding. Configure live Stripe and Prodigi keys together, set `PRODIGI_ENV=live`, register the live webhook, and redeploy. Never mix test payments with live printing.
2. Add a real business name, support email, return/refund and cancellation policy, privacy contact, retention policy, and domain. Replace sandbox policy text. Current policy page intentionally records these gaps; it is not ready-made legal advice.
3. Decide and implement sales-tax collection appropriate to the merchant. Checkout currently uses a fixed total with no tax calculation. If adding Stripe Tax, revise the payment guard to verify subtotal, shipping, and legitimate tax rather than the fixed $44 total; test it before switching on.
4. Sample the garment and print. Check fine-line clarity, scale, placement, color, sizing, and wash performance. Preview imagery is a generated mockup and the fine contours need real print QA.
5. Add operational monitoring and alerts for failed webhooks, exhausted Stripe retries, Prodigi order issues, and paid-but-unsubmitted orders. Stripe retries are not an unlimited job queue; there is no reconciliation scheduler or staff dashboard yet. Operators can inspect Stripe metadata and Prodigi and resend a webhook.
6. Configure customer receipts, shipping notifications, and support. This implementation offers a private order-status link; it does not send its own email confirmations. Configure Stripe receipts separately. Refunds and cancellations are currently managed manually in the provider dashboards; payment refunds do not automatically cancel an already-submitted print order.
7. Review live fulfillment costs, margin, tax, and shipping estimates. Add abuse protection/rate limiting and alerting for public checkout and artifact traffic. No multi-item cart, account system, international delivery, returns portal, or address correction workflow is included.

## Development

`npm install`, populate `.env.local` from `.env.example`, then `npm run dev`. Use the origin printed by your development server as `SITE_URL` locally. Use Stripe CLI forwarding for local webhook tests and its signing secret. Never expose keys in browser bundles.

## References

- Stripe fulfillment and webhook guidance: https://docs.stripe.com/checkout/fulfillment
- Prodigi API, idempotency, products, and quotes: https://www.prodigi.com/print-api/docs/reference/
- Garment specification and care: https://www.prodigi.com/products/mens-clothing/t-shirts/classic/bella-canvas-3001/
