# Field Notes

Public sandbox storefront: https://field-notes-wear.hazelcough.chatgpt.site

Personalized travel keepsake tees: a place, caption, date, landscape, and edition create a deterministic original composition. The print proof and production file share the same geometry. Three environments (coast/alpine/desert); natural Bella+Canvas 3001; S–2XL; one shirt per order; US only. Price: $38 + $6 delivery, before tax.

## Current status — payment setup is incomplete

The site is deployed as a sandbox, with the supplied Prodigi sandbox credential stored as a secret in Sites. No Stripe credential was provided. Checkout therefore fails closed with HTTP 503 and the UI explains that payment setup is pending. This is **not yet a fully functioning paid store**. No real money was charged, no order was submitted to Prodigi, and no physical item was shipped. Actual Stripe Checkout and paid-to-Prodigi end-to-end verification still need to be completed.

Prodigi product lookup verified natural S, M, L, XL and 2XL shipping to US, front resolution 2490×3510. A real sandbox quote for M succeeded: $12 print + $10.75 shipping before possible tax (quote at build time, not guaranteed future cost). Each checkout requests a fresh quote and rejects costs over $34. The consumer shipping charge is subsidized from the shirt margin.

## Architecture

- Vinext/React on Sites (Cloudflare Workers), persistent D1 order records, R2 production PDFs.
- `lib/design.ts`: shared SVG/vector geometry; server validates all personalization with Zod. English letters and simple ASCII punctuation supported.
- `lib/print.ts`: production PDF, 8.3×11.7 inches matching the selected variant's 2490×3510 pixels at 300 DPI. Vector text and curves; transparent page with no background rectangle. Graphic about 6.92 inches wide, safely inside the print area. PDFs are processed by Prodigi at their physical size.
- `/api/checkout`: validates input, checks a current supplier quote, stores immutable artwork/order, creates Stripe-hosted Checkout from server prices. Card data never touches this application.
- `/api/stripe/webhook`: HMAC signature and five-minute timestamp verification; retrieves authoritative Checkout Session; checks session ID, order metadata, client reference, currency, amount, completion, payment status and live/test mode.
- Only verified paid sessions enter `fulfill()`. A D1 lease prevents concurrent work; permanent Prodigi order UUID idempotency prevents duplicate production across retries or crashes. Stripe creation also uses an idempotency key.
- The private order link can recover fulfillment after a lost browser redirect. Stripe webhook retries handle temporary errors without depending on the customer returning.
- Public R2 file endpoint uses unguessable UUIDs and contains artwork only. Order status requires an order UUID plus separate capability token and never returns addresses or payment details.
- Hourly hashed-IP limits protect proof/checkout generation. Proof downloads do not create orders or contact Prodigi.
- Prodigi and Stripe keys are runtime secrets, never browser code or source control.

## Try the current deployment

1. Open the public URL. Pick a landscape, edit the place/caption/date, select a size, and remix.
2. Confirm the live shirt changes and the size guide opens. Reload: the draft is saved in browser local storage.
3. Download the PDF print proof. Verify the exact spelling and layout. Empty/invalid fields are rejected.
4. Checkout is intentionally disabled until credentials are configured. There is no fake-payment or bypass endpoint.

## Enable Stripe test checkout

1. Use a Stripe account you control; set a test secret API key in the Sites runtime as `STRIPE_SECRET_KEY` (secret). Never paste it into source code. `STORE_MODE=sandbox` requires `sk_test_`.
2. Register an HTTPS webhook endpoint at `https://field-notes-wear.hazelcough.chatgpt.site/api/stripe/webhook`, with `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Use API version `2024-06-20`, matching requests. Set its `whsec_...` signing secret as `STRIPE_WEBHOOK_SECRET` in Sites (secret).
3. Redeploy the saved source after runtime changes. `/api/config` should return `checkoutEnabled:true`. `PRODIGI_API_KEY` and `SITE_URL` are already configured; `STORE_MODE` remains `sandbox`.
4. In checkout use Stripe card `4242 4242 4242 4242`, a future expiry, and any three-digit CVC. Enter fictional US shipping information. Verify the order page displays a Prodigi reference and the sandbox dashboard has exactly one order.
5. Refresh/replay the Stripe event: it must retain the same Prodigi reference. Test declined card `4000 0000 0000 0002` and abandoned checkout: neither should produce an order. Use Stripe's test-mode tools only.
6. Inspect Prodigi asset download/print preparation status. No real shipping occurs in Prodigi sandbox. An accepted order alone does not prove physical print quality.

## Local development and verification

Use Node 24 (tested 24.20.0). Install dependencies using the Sites installer, or `npm ci` with the package's recorded dependency policy. Scripts:

```
npx tsc --noEmit
node tests/integration.mjs
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_kind_thunderbolt_ross.sql
npm start -- --port 8787
```

Apply the migration once per local database, not on every start. The integration suite uses an in-memory SQLite database and simulated provider responses. It tests missing credentials; validation; deterministic art; saved checkout; unpaid/wrong amount/wrong environment/wrong order rejection; failure recovery; stable upstream idempotency; repeated and concurrent requests; valid, tampered and stale signatures; and PDF generation. It does not claim to replace provider end-to-end testing.

The generated sample is `output/pdf/field-notes-print.pdf`. Browser-checked desktop and 390px mobile layouts, live inputs and sizes. The production PDF was rendered and visually inspected. Real product/quote API checks used the supplied sandbox key. The public deployment checks are recorded in `VERIFICATION.md`.

## Before taking real orders

- Complete Stripe onboarding and configure live `STRIPE_SECRET_KEY` plus a live webhook signing secret. Fund/configure a Prodigi live account, replace `PRODIGI_API_KEY`, and switch `STORE_MODE=live` together. The code refuses test/live mismatches. Never combine live payments with sandbox fulfillment.
- Order physical samples in each artwork family and representative sizes. Approve print placement, ink color, legibility, wash durability, fit and packaging. Current shirt mockups are illustrative vector previews, not photographs.
- Establish the business identity, support email/contact workflow, privacy notice, retention/deletion policy, shipping/delivery estimates, cancellation rules, return/defect/refund process, and applicable tax obligations. Replace sandbox-only product/FAQ/footer wording and remove `robots: noindex` when ready.
- Configure Stripe Tax and registrations appropriate to the business before setting `STRIPE_AUTOMATIC_TAX=true`; taxes are currently disabled. Check treatment of the shipping line item. Tax/legal compliance requires business-specific review.
- Recheck live supplier prices, sales tax, Stripe fees, shipping subsidy and profit margins. The current quote guard is a cost ceiling, not a complete accounting system.
- Add production alerting for failed Stripe webhooks and `paid_retry_pending`/`needs_attention` D1 orders. Stripe retries are finite. Run regular reconciliation against paid Stripe sessions and Prodigi orders; manually retry a failed signed webhook after resolving the cause. Refund in Stripe and cancel in Prodigi as two separate operations; automatic refunds/cancellations are not implemented.
- Configure customer receipt/confirmation and shipping notification emails. Current status is through the private return-page link; no store-operated email service is installed. Ensure customers can recover order links via a support process.
- Define retention and lifecycle cleanup for expired unpaid checkout records, R2 proofs and paid orders. Current records persist; rate-limit rows self-clean. Add stronger bot protection and abuse controls before meaningful traffic.
- Connect a branded domain if desired; update `SITE_URL`, webhook destination and redeploy together. Keep webhook and asset routes public so Stripe and Prodigi can reach them.
- Geographic scope is US-only, English text, one item per checkout, natural cotton only. No accounts, multi-item cart, promotions, automated refund UI, production admin UI, or address changes after checkout.

## Reference documentation

- https://www.prodigi.com/print-api/docs/reference/
- https://www.prodigi.com/products/mens-clothing/t-shirts/classic/bella-canvas-3001/
- https://docs.stripe.com/checkout/fulfillment
- https://docs.stripe.com/api/checkout/sessions/create
